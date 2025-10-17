import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Konfiguracija kako će se notifikacije prikazivati dok je app aktivan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Registruje uređaj za push notifikacije i čuva token na backend
   */
  async registerForPushNotifications() {
    try {
      // Proveri da li je fizički uređaj (emulator ne podržava push notifikacije)
      if (!Device.isDevice) {
        console.log('⚠️ Push notifikacije ne rade na emulatoru');
        return null;
      }

      // Proveri da li je Expo Go ili standalone build
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        console.log('⚠️ Push notifikacije se preskačuju u Expo Go - biće aktivne u APK buildu');
        return null;
      }

      // Proveri Android dozvole
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Robotik notifikacije',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      // Zatraži dozvolu od korisnika
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Korisnik nije dozvolio notifikacije');
        return null;
      }

      // Dobij Expo push token - za standalone build automatski će koristiti projectId iz app.json
      const tokenOptions = {};

      // Pokušaj da dobije projectId iz config-a ako postoji
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        tokenOptions.projectId = projectId;
      }

      const token = await Notifications.getExpoPushTokenAsync(tokenOptions);

      console.log('✅ Push token dobijen:', token.data);

      // Pošalji token na backend
      try {
        await api.post('/api/android-notifications/register-token', {
          pushToken: token.data,
        });
        console.log('✅ Token uspešno registrovan na backend');
      } catch (error) {
        console.error('❌ Greška pri slanju tokena na backend:', error);
      }

      return token.data;
    } catch (error) {
      console.error('❌ Greška pri registraciji push notifikacija:', error);
      return null;
    }
  }

  /**
   * Postavlja listener-e za primanje notifikacija
   */
  setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    // Listener za notifikaciju dok je app otvoren
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notifikacija primljena:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener za tap na notifikaciju
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notifikacija kliknuta:', response);
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      }
    );
  }

  /**
   * Uklanja listener-e
   */
  removeNotificationListeners() {
    try {
      if (this.notificationListener) {
        this.notificationListener.remove();
      }
      if (this.responseListener) {
        this.responseListener.remove();
      }
    } catch (error) {
      console.error('Greška pri uklanjanju notification listeners:', error);
    }
  }

  /**
   * Prikaži lokalnu notifikaciju (test funkcija)
   */
  async scheduleLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // null znači odmah
      });
    } catch (error) {
      console.error('Greška pri prikazu lokalne notifikacije:', error);
    }
  }

  /**
   * Postavi badge broj (broj nepročitanih notifikacija)
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Greška pri postavljanju badge-a:', error);
    }
  }

  /**
   * Dobij sve notifikacije sa backend-a
   */
  async fetchNotifications() {
    try {
      const response = await api.get('/api/android-notifications');
      return response.data;
    } catch (error) {
      console.error('Greška pri učitavanju notifikacija:', error);
      throw error;
    }
  }

  /**
   * Označi notifikaciju kao pročitanu
   */
  async markAsRead(notificationId) {
    try {
      await api.put(`/api/android-notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Greška pri označavanju notifikacije:', error);
      throw error;
    }
  }

  /**
   * Obriši notifikaciju
   */
  async deleteNotification(notificationId) {
    try {
      await api.delete(`/api/android-notifications/${notificationId}`);
    } catch (error) {
      console.error('Greška pri brisanju notifikacije:', error);
      throw error;
    }
  }

  /**
   * Dobij broj nepročitanih notifikacija
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/api/android-notifications/unread-count');
      return response.data.count;
    } catch (error) {
      console.error('Greška pri učitavanju broja nepročitanih:', error);
      return 0;
    }
  }
}

export default new NotificationService();
