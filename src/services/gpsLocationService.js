import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert, Linking } from 'react-native';
import { gpsAPI } from './api';

const GPS_LOCATION_TASK = 'GPS_LOCATION_TASK';

class GPSLocationService {
  constructor() {
    this.isInitialized = false;
    this.hasPermission = false;
    this.hasForegroundPermission = false;
    this.hasBackgroundPermission = false;
  }

  /**
   * Inicijalizacija servisa - zatraži dozvole
   * OVO SE POZIVA ODMAH NAKON LOGIN-A
   */
  async initialize() {
    try {
      console.log('[GPSLocationService] ========================================');
      console.log('[GPSLocationService] INITIALIZING GPS LOCATION SERVICE');
      console.log('[GPSLocationService] ========================================');

      // Proveri da li su location servisi dostupni
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log('[GPSLocationService] Location services enabled:', isEnabled);

      if (!isEnabled) {
        console.log('[GPSLocationService] Location services are DISABLED!');
        Alert.alert(
          'Lokacija isključena',
          'Molimo uključite GPS lokaciju u podešavanjima telefona da biste omogućili praćenje.',
          [
            { text: 'Podešavanja', onPress: () => Linking.openSettings() },
            { text: 'Otkaži', style: 'cancel' }
          ]
        );
        return false;
      }

      // Proveri trenutni status dozvola
      const { status: currentForeground } = await Location.getForegroundPermissionsAsync();
      console.log('[GPSLocationService] Current foreground permission:', currentForeground);

      // Zatraži FOREGROUND dozvolu UVEK - čak i ako već postoji
      console.log('[GPSLocationService] Requesting FOREGROUND permission...');
      const { status: foregroundStatus, canAskAgain: canAskForeground } = await Location.requestForegroundPermissionsAsync();
      console.log('[GPSLocationService] Foreground permission result:', foregroundStatus, 'canAskAgain:', canAskForeground);

      if (foregroundStatus !== 'granted') {
        console.log('[GPSLocationService] Foreground permission DENIED!');
        if (!canAskForeground) {
          Alert.alert(
            'Dozvola potrebna',
            'Aplikacija zahteva pristup lokaciji. Molimo omogućite dozvolu u podešavanjima aplikacije.',
            [
              { text: 'Podešavanja', onPress: () => Linking.openSettings() },
              { text: 'Otkaži', style: 'cancel' }
            ]
          );
        }
        return false;
      }

      this.hasForegroundPermission = true;
      console.log('[GPSLocationService] ✅ Foreground permission GRANTED');

      // Zatraži BACKGROUND dozvolu (Android)
      if (Platform.OS === 'android') {
        console.log('[GPSLocationService] Requesting BACKGROUND permission...');

        // SDK 52 ima bug - nekad treba 2x zatražiti
        let backgroundResult = await Location.requestBackgroundPermissionsAsync();
        console.log('[GPSLocationService] Background permission result (1st try):', backgroundResult.status);

        if (backgroundResult.status !== 'granted') {
          // Pokušaj još jednom (SDK 52 bug workaround)
          console.log('[GPSLocationService] Trying background permission again (SDK 52 workaround)...');
          await new Promise(resolve => setTimeout(resolve, 500));
          backgroundResult = await Location.requestBackgroundPermissionsAsync();
          console.log('[GPSLocationService] Background permission result (2nd try):', backgroundResult.status);
        }

        if (backgroundResult.status === 'granted') {
          this.hasBackgroundPermission = true;
          console.log('[GPSLocationService] ✅ Background permission GRANTED');
        } else {
          console.log('[GPSLocationService] ⚠️ Background permission denied (will work in foreground only)');
        }
      }

      this.hasPermission = true;
      this.isInitialized = true;
      console.log('[GPSLocationService] ========================================');
      console.log('[GPSLocationService] INITIALIZATION COMPLETE');
      console.log('[GPSLocationService] Foreground:', this.hasForegroundPermission);
      console.log('[GPSLocationService] Background:', this.hasBackgroundPermission);
      console.log('[GPSLocationService] ========================================');
      return true;

    } catch (error) {
      console.error('[GPSLocationService] ========================================');
      console.error('[GPSLocationService] INITIALIZATION ERROR:', error);
      console.error('[GPSLocationService] ========================================');
      return false;
    }
  }

  /**
   * Dobij trenutnu lokaciju i pošalji na server
   * Ovo se poziva kada stigne push notifikacija za GPS zahtev
   */
  async getCurrentLocationAndSend(requestId = null) {
    try {
      console.log('[GPSLocationService] ========================================');
      console.log('[GPSLocationService] GETTING AND SENDING LOCATION');
      console.log('[GPSLocationService] Request ID:', requestId);
      console.log('[GPSLocationService] ========================================');

      // Proveri da li su location servisi uključeni
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log('[GPSLocationService] Location services enabled:', isEnabled);

      if (!isEnabled) {
        console.error('[GPSLocationService] Location services are DISABLED!');
        return { success: false, error: 'Location services are disabled' };
      }

      // Proveri/zatraži dozvole
      if (!this.hasPermission || !this.hasForegroundPermission) {
        console.log('[GPSLocationService] Permissions not granted, initializing...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('[GPSLocationService] Cannot get location - permission denied');
          return { success: false, error: 'No location permission' };
        }
      }

      // Pokušaj dobiti lokaciju sa timeout-om
      console.log('[GPSLocationService] Requesting current position...');
      const startTime = Date.now();

      let location;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
          mayShowUserSettingsDialog: true,
        });
      } catch (locationError) {
        console.error('[GPSLocationService] High accuracy failed, trying balanced...', locationError.message);
        // Fallback na nižu preciznost
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      const elapsed = Date.now() - startTime;
      console.log(`[GPSLocationService] Location obtained in ${elapsed}ms:`, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });

      // Pripremi podatke za slanje
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        deviceTimestamp: new Date(location.timestamp).toISOString(),
        requestId: requestId,
        requestType: requestId ? 'admin_request' : 'manual',
      };

      // Pošalji na server sa retry logikom
      console.log('[GPSLocationService] Sending location to server...');
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await gpsAPI.sendLocation(locationData);

          if (response.data.success) {
            console.log('[GPSLocationService] ✅ Location sent successfully!');
            console.log('[GPSLocationService] ========================================');
            return { success: true, location: locationData };
          } else {
            console.error('[GPSLocationService] Server rejected location:', response.data.message);
            lastError = response.data.message;
          }
        } catch (sendError) {
          console.error(`[GPSLocationService] Send attempt ${attempt} failed:`, sendError.message);
          lastError = sendError.message;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      console.error('[GPSLocationService] All send attempts failed');
      console.log('[GPSLocationService] ========================================');
      return { success: false, error: lastError || 'Failed to send location' };

    } catch (error) {
      console.error('[GPSLocationService] ========================================');
      console.error('[GPSLocationService] ERROR:', error.message);
      console.error('[GPSLocationService] ========================================');
      return { success: false, error: error.message };
    }
  }

  /**
   * Handler za GPS zahtev iz push notifikacije
   * Poziva se iz App.js kada stigne notifikacija tipa 'gps_location_request'
   */
  async handleGPSRequest(notificationData) {
    try {
      console.log('[GPSLocationService] Handling GPS request from notification');
      console.log('[GPSLocationService] Request data:', notificationData);

      const requestId = notificationData?.requestId || null;
      const result = await this.getCurrentLocationAndSend(requestId);

      if (result.success) {
        console.log('[GPSLocationService] GPS request handled successfully');
      } else {
        console.error('[GPSLocationService] GPS request failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[GPSLocationService] Error handling GPS request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Proveri da li ima dozvole za lokaciju
   */
  async checkPermissions() {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('[GPSLocationService] Error checking permissions:', error);
      return { foreground: false, background: false };
    }
  }

  /**
   * Proveri da li su location servisi uključeni
   */
  async isLocationEnabled() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('[GPSLocationService] Error checking location services:', error);
      return false;
    }
  }
}

// Singleton instanca
const gpsLocationService = new GPSLocationService();
export default gpsLocationService;
