/**
 * Testovi za GPSLocationService
 *
 * Testira:
 * 1. Inicijalizacija i dozvole
 * 2. Pokretanje background tracking-a
 * 3. Zaustavljanje background tracking-a
 * 4. Slanje lokacije na zahtev (on-demand)
 * 5. Edge cases: dupli start, stop bez starta, itd.
 */

// ============ MOCKS ============

const mockRequestForegroundPermissions = jest.fn();
const mockRequestBackgroundPermissions = jest.fn();
const mockGetForegroundPermissions = jest.fn();
const mockGetBackgroundPermissions = jest.fn();
const mockHasServicesEnabled = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockStartLocationUpdates = jest.fn();
const mockStopLocationUpdates = jest.fn();
const mockHasStartedLocationUpdates = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: mockRequestForegroundPermissions,
  requestBackgroundPermissionsAsync: mockRequestBackgroundPermissions,
  getForegroundPermissionsAsync: mockGetForegroundPermissions,
  getBackgroundPermissionsAsync: mockGetBackgroundPermissions,
  hasServicesEnabledAsync: mockHasServicesEnabled,
  getCurrentPositionAsync: mockGetCurrentPosition,
  startLocationUpdatesAsync: mockStartLocationUpdates,
  stopLocationUpdatesAsync: mockStopLocationUpdates,
  hasStartedLocationUpdatesAsync: mockHasStartedLocationUpdates,
  Accuracy: {
    Balanced: 3,
    High: 4,
  },
  ActivityType: {
    AutomotiveNavigation: 3,
  },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

// Mock backgroundLocationTask - samo konstanta, ne task callback
jest.mock('../backgroundLocationTask', () => ({
  BACKGROUND_LOCATION_TASK: 'BACKGROUND_LOCATION_TRACKING',
}));

const mockSendLocation = jest.fn();
jest.mock('../api', () => ({
  gpsAPI: {
    sendLocation: mockSendLocation,
  },
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
}));

// ============ HELPERS ============

const MOCK_LOCATION_RESPONSE = {
  coords: {
    latitude: 44.8176,
    longitude: 20.4633,
    accuracy: 10,
    altitude: 117,
    speed: 0,
    heading: 0,
  },
  timestamp: Date.now(),
};

function createFreshService() {
  jest.resetModules();

  // Re-apply mocks after resetModules
  jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: mockRequestForegroundPermissions,
    requestBackgroundPermissionsAsync: mockRequestBackgroundPermissions,
    getForegroundPermissionsAsync: mockGetForegroundPermissions,
    getBackgroundPermissionsAsync: mockGetBackgroundPermissions,
    hasServicesEnabledAsync: mockHasServicesEnabled,
    getCurrentPositionAsync: mockGetCurrentPosition,
    startLocationUpdatesAsync: mockStartLocationUpdates,
    stopLocationUpdatesAsync: mockStopLocationUpdates,
    hasStartedLocationUpdatesAsync: mockHasStartedLocationUpdates,
    Accuracy: { Balanced: 3, High: 4 },
    ActivityType: { AutomotiveNavigation: 3 },
  }));
  jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
  jest.mock('../backgroundLocationTask', () => ({
    BACKGROUND_LOCATION_TASK: 'BACKGROUND_LOCATION_TRACKING',
  }));
  jest.mock('../api', () => ({
    gpsAPI: { sendLocation: mockSendLocation },
  }));
  jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
    Alert: { alert: jest.fn() },
    Linking: { openSettings: jest.fn() },
  }));

  return require('../gpsLocationService').default;
}

function setupAllPermissionsGranted() {
  mockHasServicesEnabled.mockResolvedValue(true);
  mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
  mockRequestForegroundPermissions.mockResolvedValue({ status: 'granted', canAskAgain: true });
  mockRequestBackgroundPermissions.mockResolvedValue({ status: 'granted' });
  mockHasStartedLocationUpdates.mockResolvedValue(false);
  mockStartLocationUpdates.mockResolvedValue(undefined);
  mockStopLocationUpdates.mockResolvedValue(undefined);
}

// ============ TESTS ============

describe('GPSLocationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    setupAllPermissionsGranted();
    service = createFreshService();
  });

  // ------ INICIJALIZACIJA ------

  describe('initialize()', () => {
    it('vraća true kad su sve dozvole odobrene', async () => {
      const result = await service.initialize();
      expect(result).toBe(true);
      expect(service.hasForegroundPermission).toBe(true);
      expect(service.hasBackgroundPermission).toBe(true);
      expect(service.isInitialized).toBe(true);
    });

    it('vraća false kad su location servisi isključeni', async () => {
      mockHasServicesEnabled.mockResolvedValue(false);
      const result = await service.initialize();
      expect(result).toBe(false);
    });

    it('vraća false kad foreground dozvola nije odobrena', async () => {
      mockRequestForegroundPermissions.mockResolvedValue({ status: 'denied', canAskAgain: true });
      const result = await service.initialize();
      expect(result).toBe(false);
      expect(service.hasForegroundPermission).toBe(false);
    });

    it('radi i bez background dozvole (foreground only)', async () => {
      mockRequestBackgroundPermissions.mockResolvedValue({ status: 'denied' });
      const result = await service.initialize();
      expect(result).toBe(true);
      expect(service.hasForegroundPermission).toBe(true);
      expect(service.hasBackgroundPermission).toBe(false);
    });

    it('zatraži foreground dozvolu na Androidu', async () => {
      await service.initialize();
      expect(mockRequestForegroundPermissions).toHaveBeenCalled();
    });

    it('zatraži background dozvolu na Androidu', async () => {
      await service.initialize();
      expect(mockRequestBackgroundPermissions).toHaveBeenCalled();
    });
  });

  // ------ START BACKGROUND TRACKING ------

  describe('startBackgroundTracking()', () => {
    it('pokreće location updates sa ispravnim parametrima', async () => {
      await service.initialize();
      const result = await service.startBackgroundTracking();

      expect(result).toBe(true);
      expect(service.isBackgroundTrackingActive).toBe(true);
      expect(mockStartLocationUpdates).toHaveBeenCalledWith(
        'BACKGROUND_LOCATION_TRACKING',
        expect.objectContaining({
          accuracy: 3, // Balanced
          timeInterval: 300000, // 5 minuta
          distanceInterval: 100,
          foregroundService: expect.objectContaining({
            notificationTitle: 'Robotik - Praćenje lokacije',
            notificationBody: expect.any(String),
          }),
        })
      );
    });

    it('NE pokreće ako nema background dozvolu', async () => {
      mockRequestBackgroundPermissions.mockResolvedValue({ status: 'denied' });
      await service.initialize();
      const result = await service.startBackgroundTracking();

      expect(result).toBe(false);
      expect(mockStartLocationUpdates).not.toHaveBeenCalled();
    });

    it('vraća true odmah ako je tracking već aktivan', async () => {
      mockHasStartedLocationUpdates.mockResolvedValue(true);
      await service.initialize();
      const result = await service.startBackgroundTracking();

      expect(result).toBe(true);
      expect(service.isBackgroundTrackingActive).toBe(true);
      expect(mockStartLocationUpdates).not.toHaveBeenCalled(); // Ne pokreće ponovo
    });

    it('handluje grešku kod startLocationUpdatesAsync', async () => {
      mockStartLocationUpdates.mockRejectedValue(new Error('Service not available'));
      await service.initialize();
      const result = await service.startBackgroundTracking();

      expect(result).toBe(false);
    });

    it('koristi foreground service notification (obavezno za Android)', async () => {
      await service.initialize();
      await service.startBackgroundTracking();

      const config = mockStartLocationUpdates.mock.calls[0][1];
      expect(config.foregroundService).toBeDefined();
      expect(config.foregroundService.notificationTitle).toBeTruthy();
      expect(config.foregroundService.notificationBody).toBeTruthy();
    });

    it('koristi AutomotiveNavigation activity type', async () => {
      await service.initialize();
      await service.startBackgroundTracking();

      const config = mockStartLocationUpdates.mock.calls[0][1];
      expect(config.activityType).toBe(3); // AutomotiveNavigation
    });
  });

  // ------ STOP BACKGROUND TRACKING ------

  describe('stopBackgroundTracking()', () => {
    it('zaustavlja tracking kad je aktivan', async () => {
      mockHasStartedLocationUpdates.mockResolvedValue(true);
      await service.stopBackgroundTracking();

      expect(mockStopLocationUpdates).toHaveBeenCalledWith('BACKGROUND_LOCATION_TRACKING');
      expect(service.isBackgroundTrackingActive).toBe(false);
    });

    it('ne radi ništa kad tracking nije aktivan', async () => {
      mockHasStartedLocationUpdates.mockResolvedValue(false);
      await service.stopBackgroundTracking();

      expect(mockStopLocationUpdates).not.toHaveBeenCalled();
      expect(service.isBackgroundTrackingActive).toBe(false);
    });

    it('handluje grešku gracefully', async () => {
      mockHasStartedLocationUpdates.mockRejectedValue(new Error('Unknown error'));

      await expect(service.stopBackgroundTracking()).resolves.not.toThrow();
    });
  });

  // ------ ON-DEMAND LOCATION (push notifikacija) ------

  describe('getCurrentLocationAndSend()', () => {
    beforeEach(() => {
      mockGetCurrentPosition.mockResolvedValue(MOCK_LOCATION_RESPONSE);
      mockSendLocation.mockResolvedValue({ data: { success: true } });
    });

    it('šalje lokaciju sa requestType "admin_request" kad ima requestId', async () => {
      await service.initialize();
      const result = await service.getCurrentLocationAndSend('req-123');

      expect(result.success).toBe(true);
      expect(mockSendLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
          requestType: 'admin_request',
          latitude: 44.8176,
          longitude: 20.4633,
        })
      );
    });

    it('šalje lokaciju sa requestType "manual" kad nema requestId', async () => {
      await service.initialize();
      const result = await service.getCurrentLocationAndSend(null);

      expect(result.success).toBe(true);
      const sentData = mockSendLocation.mock.calls[0][0];
      expect(sentData.requestType).toBe('manual');
    });

    it('retry-uje 3 puta kad slanje ne uspe', async () => {
      mockSendLocation
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: { success: true } });

      await service.initialize();
      const result = await service.getCurrentLocationAndSend('req-123');

      expect(result.success).toBe(true);
      expect(mockSendLocation).toHaveBeenCalledTimes(3);
    });

    it('vraća error kad sva 3 pokušaja ne uspe', async () => {
      mockSendLocation.mockRejectedValue(new Error('Network Error'));

      await service.initialize();
      const result = await service.getCurrentLocationAndSend('req-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('fallback na Balanced accuracy kad High failuje', async () => {
      mockGetCurrentPosition
        .mockRejectedValueOnce(new Error('GPS timeout'))
        .mockResolvedValueOnce(MOCK_LOCATION_RESPONSE);

      await service.initialize();
      const result = await service.getCurrentLocationAndSend('req-123');

      expect(result.success).toBe(true);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);
      // Drugi poziv koristi Balanced
      expect(mockGetCurrentPosition.mock.calls[1][0]).toEqual(
        expect.objectContaining({ accuracy: 3 })
      );
    });

    it('vraća error kad location servisi su ugašeni', async () => {
      mockHasServicesEnabled.mockResolvedValue(false);

      // Resetuj service da nema cached permission
      service = createFreshService();
      mockHasServicesEnabled.mockResolvedValue(false);

      const result = await service.getCurrentLocationAndSend('req-123');
      expect(result.success).toBe(false);
    });
  });

  // ------ handleGPSRequest ------

  describe('handleGPSRequest()', () => {
    beforeEach(() => {
      mockGetCurrentPosition.mockResolvedValue(MOCK_LOCATION_RESPONSE);
      mockSendLocation.mockResolvedValue({ data: { success: true } });
    });

    it('prosleđuje requestId iz notifikacije', async () => {
      await service.initialize();
      const result = await service.handleGPSRequest({ requestId: 'notif-req-456' });

      expect(result.success).toBe(true);
      expect(mockSendLocation).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'notif-req-456' })
      );
    });

    it('radi i kad notificationData nema requestId', async () => {
      await service.initialize();
      const result = await service.handleGPSRequest({});

      expect(result.success).toBe(true);
      expect(mockSendLocation).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: null, requestType: 'manual' })
      );
    });
  });

  // ------ LIFECYCLE: LOGIN → TRACKING → LOGOUT ------

  describe('Kompletan lifecycle (login → track → logout)', () => {
    it('simulira pun ciklus: init → start → stop', async () => {
      // 1. Login - inicijalizacija
      const initResult = await service.initialize();
      expect(initResult).toBe(true);

      // 2. Pokreni tracking
      const trackResult = await service.startBackgroundTracking();
      expect(trackResult).toBe(true);
      expect(service.isBackgroundTrackingActive).toBe(true);

      // 3. Proveri da je startLocationUpdatesAsync pozvan
      expect(mockStartLocationUpdates).toHaveBeenCalledTimes(1);

      // 4. Logout - zaustavi tracking
      mockHasStartedLocationUpdates.mockResolvedValue(true);
      await service.stopBackgroundTracking();
      expect(service.isBackgroundTrackingActive).toBe(false);
      expect(mockStopLocationUpdates).toHaveBeenCalledTimes(1);
    });

    it('dupli start ne pokreće tracking dva puta', async () => {
      await service.initialize();

      // Posle prvog starta, hasStartedLocationUpdates vraća true
      mockHasStartedLocationUpdates
        .mockResolvedValueOnce(false) // Prvi poziv - nije aktivan
        .mockResolvedValueOnce(true); // Drugi poziv - već aktivan

      await service.startBackgroundTracking();
      await service.startBackgroundTracking();

      // startLocationUpdatesAsync se poziva samo jednom
      expect(mockStartLocationUpdates).toHaveBeenCalledTimes(1);
    });
  });

  // ------ CHECK PERMISSIONS ------

  describe('checkPermissions()', () => {
    it('vraća status obe dozvole', async () => {
      mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
      mockGetBackgroundPermissions.mockResolvedValue({ status: 'denied' });

      const result = await service.checkPermissions();
      expect(result).toEqual({ foreground: true, background: false });
    });
  });
});
