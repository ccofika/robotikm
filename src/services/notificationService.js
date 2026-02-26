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
   * Šalje debug info na server
   */
  async sendDebugToServer(stage, data) {
    try {
      await api.post('/api/android-notifications/debug-register', {
        stage,
        data,
        timestamp: new Date().toISOString(),
        device: {
          brand: Device.brand,
          model: Device.modelName,
          os: Platform.OS,
          isDevice: Device.isDevice,
        }
      });
    } catch (e) {
      // Ignore errors from debug endpoint
    }
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
      console.log('Device.brand:', Device.brand);
      console.log('Device.modelName:', Device.modelName);

      // Pošalji debug info na server - START
      await this.sendDebugToServer('START', {
        isDevice: Device.isDevice,
        appOwnership: Constants.appOwnership,
        platform: Platform.OS,
      });

      // Proveri da li je fizički uređaj (emulator ne podržava push notifikacije)
      if (!Device.isDevice) {
        console.log('⚠️ Push notifikacije ne rade na emulatoru');
        await this.sendDebugToServer('NOT_DEVICE', { reason: 'emulator' });
        return null;
      }

      // Proveri da li je Expo Go ili standalone build
      const isExpoGo = Constants.appOwnership === 'expo';
      console.log('isExpoGo:', isExpoGo);
      await this.sendDebugToServer('EXPO_CHECK', { isExpoGo, appOwnership: Constants.appOwnership });

      // Kreiraj sve notification kanale za Android PRVO (Android 13+ zahteva ovo)
      console.log('Setting up notification channels FIRST (required for Android 13+)...');
      const channelsCreated = await setupNotificationChannels();
      console.log('Notification channels setup result:', channelsCreated);
      await this.sendDebugToServer('CHANNELS', { created: channelsCreated });

      // Zatraži dozvolu od korisnika
      console.log('Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing permission status:', existingStatus);
      await this.sendDebugToServer('PERMISSION_CHECK', { existingStatus });

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
        await this.sendDebugToServer('PERMISSION_REQUEST', { finalStatus });
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Korisnik nije dozvolio notifikacije - status:', finalStatus);
        await this.sendDebugToServer('PERMISSION_DENIED', { finalStatus });
        return null;
      }

      console.log('✅ Dozvola za notifikacije odobrena');
      await this.sendDebugToServer('PERMISSION_GRANTED', { finalStatus });

      // Dobij Expo push token - koristi eksplicitni projectId
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                        Constants.easConfig?.projectId ??
                        '7c5bfec7-0a8a-49f6-89b4-7408977feb4f'; // Fallback na poznati projectId

      console.log('ProjectId being used:', projectId);
      await this.sendDebugToServer('PROJECT_ID', { projectId });

      console.log('Getting Expo push token...');
      await this.sendDebugToServer('GETTING_TOKEN', { message: 'About to call getExpoPushTokenAsync' });

      // Timeout wrapper - getExpoPushTokenAsync može da visi zauvek
      const getTokenWithTimeout = (options, timeoutMs = 15000) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`getExpoPushTokenAsync timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          Notifications.getExpoPushTokenAsync(options)
            .then(result => {
              clearTimeout(timeout);
              resolve(result);
            })
            .catch(error => {
              clearTimeout(timeout);
              reject(error);
            });
        });
      };

      let token;
      try {
        token = await getTokenWithTimeout({ projectId }, 15000);
        console.log('✅ Push token dobijen:', token.data);
        await this.sendDebugToServer('TOKEN_SUCCESS', { token: token.data });
      } catch (tokenError) {
        console.error('❌ Greška pri dobijanju push tokena:', tokenError);
        console.error('TokenError name:', tokenError.name);
        console.error('TokenError message:', tokenError.message);
        await this.sendDebugToServer('TOKEN_ERROR', {
          name: tokenError.name,
          message: tokenError.message,
          stack: tokenError.stack
        });

        // Pokušaj bez projectId kao fallback
        try {
          console.log('Trying to get token without projectId...');
          await this.sendDebugToServer('TOKEN_FALLBACK', { message: 'Trying without projectId' });
          token = await getTokenWithTimeout({}, 15000);
          console.log('✅ Push token dobijen (bez projectId):', token.data);
          await this.sendDebugToServer('TOKEN_FALLBACK_SUCCESS', { token: token.data });
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError.message);
          await this.sendDebugToServer('TOKEN_FALLBACK_ERROR', {
            message: fallbackError.message,
            stack: fallbackError.stack
          });
          return null;
        }
      }

      if (!token || !token.data) {
        console.error('❌ Token je prazan ili undefined');
        await this.sendDebugToServer('TOKEN_EMPTY', { token });
        return null;
      }

      // Pošalji token na backend - sa više pokušaja
      console.log('Sending token to backend...');
      console.log('Token to send:', token.data);

      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const response = await api.post('/api/android-notifications/register-token', {
            pushToken: token.data,
          });
          console.log('✅ Token uspešno registrovan na backend!');
          console.log('Backend response:', JSON.stringify(response.data, null, 2));
          console.log('=== REGISTER FOR PUSH NOTIFICATIONS SUCCESS ===');
          return token.data;
        } catch (error) {
          lastError = error;
          console.error(`❌ Greška pri slanju tokena na backend (pokušaj ${4 - retries}/3):`, error.message);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          retries--;
          if (retries > 0) {
            console.log(`Čekam 2 sekunde pre sledećeg pokušaja...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      console.error('❌ Svi pokušaji registracije tokena su neuspeli');
      console.error('Last error:', lastError);
      console.log('=== REGISTER FOR PUSH NOTIFICATIONS END (WITH ERRORS) ===');
      return token.data; // Vrati token čak i ako backend registracija nije uspela
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
