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

/**
 * Kreiranje svih Android notification kanala
 * OVA FUNKCIJA SE MORA POZVATI ŠTO PRE MOGUĆE PRI POKRETANJU APP-A
 * KRITIČNO: Channels moraju postojati PRE nego što prva notifikacija stigne!
 */
export async function setupNotificationChannels() {
  try {
    // Samo za Android
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('📱 Kreiram Android notification kanale...');

    // Default kanal - generalne notifikacije
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Robotik notifikacije',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    // Kanal za radne naloge (Work Orders)
    await Notifications.setNotificationChannelAsync('work-orders', {
      name: 'Radni nalozi',
      description: 'Notifikacije za dodeljene i ažurirane radne naloge',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // Kanal za dodatu opremu (Equipment Added)
    await Notifications.setNotificationChannelAsync('equipment-added', {
      name: 'Dodata oprema',
      description: 'Notifikacije kada vam je dodeljena nova oprema',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // Kanal za uklonjenu opremu (Equipment Removed)
    await Notifications.setNotificationChannelAsync('equipment-removed', {
      name: 'Uklonjena oprema',
      description: 'Notifikacije kada vam je uklonjena oprema',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F44336',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    console.log('✅ Svi notification kanali uspešno kreirani');
    return true;

  } catch (error) {
    console.error('❌ Greška pri kreiranju notification kanala:', error);
    return false;
  }
}

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
      console.log('=== REGISTER FOR PUSH NOTIFICATIONS START ===');
      console.log('Device.isDevice:', Device.isDevice);
      console.log('Constants.appOwnership:', Constants.appOwnership);
      console.log('Platform.OS:', Platform.OS);

      // Proveri da li je fizički uređaj (emulator ne podržava push notifikacije)
      if (!Device.isDevice) {
        console.log('⚠️ Push notifikacije ne rade na emulatoru');
        return null;
      }

      // Proveri da li je Expo Go ili standalone build
      const isExpoGo = Constants.appOwnership === 'expo';
      console.log('isExpoGo:', isExpoGo);

      if (isExpoGo) {
        console.log('⚠️ Push notifikacije se preskačuju u Expo Go - biće aktivne u APK buildu');
        return null;
      }

      // Kreiraj sve notification kanale za Android
      console.log('Setting up notification channels...');
      await setupNotificationChannels();
      console.log('Notification channels setup complete');

      // Zatraži dozvolu od korisnika
      console.log('Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing permission status:', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('🔔 Tražim dozvolu za notifikacije...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        console.log('New permission status:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Korisnik nije dozvolio notifikacije - status:', finalStatus);
        return null;
      }

      console.log('✅ Dozvola za notifikacije odobrena');

      // Dobij Expo push token
      const tokenOptions = {};
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      console.log('ProjectId from config:', projectId);

      if (projectId) {
        tokenOptions.projectId = projectId;
      }

      console.log('Getting Expo push token with options:', tokenOptions);
      const token = await Notifications.getExpoPushTokenAsync(tokenOptions);
      console.log('✅ Push token dobijen:', token.data);

      // Pošalji token na backend
      console.log('Sending token to backend...');
      try {
        const response = await api.post('/api/android-notifications/register-token', {
          pushToken: token.data,
        });
        console.log('✅ Token uspešno registrovan na backend');
        console.log('Backend response:', response.data);
      } catch (error) {
        console.error('❌ Greška pri slanju tokena na backend:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
      }

      console.log('=== REGISTER FOR PUSH NOTIFICATIONS END ===');
      return token.data;
    } catch (error) {
      console.error('=== REGISTER PUSH NOTIFICATIONS ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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
