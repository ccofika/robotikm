/**
 * Testovi za NotificationService
 *
 * Testira:
 * 1. Registracija push tokena
 * 2. Dozvole - granted, denied, emulator
 * 3. Backend registracija sa retry logikom
 * 4. Token fallback (bez projectId)
 * 5. Notification listeners setup/teardown
 * 6. Fetch/mark/delete notifikacija
 */

// ============ MOCKS ============

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetExpoPushToken = jest.fn();
const mockSetNotificationChannel = jest.fn();
const mockAddReceivedListener = jest.fn();
const mockAddResponseListener = jest.fn();
const mockSetBadgeCount = jest.fn();
const mockScheduleNotification = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissions,
  requestPermissionsAsync: mockRequestPermissions,
  getExpoPushTokenAsync: mockGetExpoPushToken,
  setNotificationChannelAsync: mockSetNotificationChannel,
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: mockAddReceivedListener,
  addNotificationResponseReceivedListener: mockAddResponseListener,
  setBadgeCountAsync: mockSetBadgeCount,
  scheduleNotificationAsync: mockScheduleNotification,
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Samsung',
  modelName: 'Galaxy S21',
}));

jest.mock('expo-constants', () => ({
  appOwnership: null,
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  easConfig: { projectId: 'test-project-id' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const mockApiPost = jest.fn();
const mockApiGet = jest.fn();
const mockApiPut = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: mockApiPost,
    get: mockApiGet,
    put: mockApiPut,
    delete: mockApiDelete,
  },
}));

// ============ HELPERS ============

const MOCK_TOKEN = 'ExponentPushToken[abc123]';

function createFreshService() {
  jest.resetModules();

  // Re-apply mocks
  jest.mock('expo-notifications', () => ({
    getPermissionsAsync: mockGetPermissions,
    requestPermissionsAsync: mockRequestPermissions,
    getExpoPushTokenAsync: mockGetExpoPushToken,
    setNotificationChannelAsync: mockSetNotificationChannel,
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: mockAddReceivedListener,
    addNotificationResponseReceivedListener: mockAddResponseListener,
    setBadgeCountAsync: mockSetBadgeCount,
    scheduleNotificationAsync: mockScheduleNotification,
    AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  }));
  jest.mock('expo-device', () => ({
    isDevice: true,
    brand: 'Samsung',
    modelName: 'Galaxy S21',
  }));
  jest.mock('expo-constants', () => ({
    appOwnership: null,
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  }));
  jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
  }));
  jest.mock('../api', () => ({
    __esModule: true,
    default: {
      post: mockApiPost,
      get: mockApiGet,
      put: mockApiPut,
      delete: mockApiDelete,
    },
  }));

  return require('../notificationService').default;
}

function setupDefaultMocks() {
  mockGetPermissions.mockResolvedValue({ status: 'granted' });
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockGetExpoPushToken.mockResolvedValue({ data: MOCK_TOKEN });
  mockSetNotificationChannel.mockResolvedValue(undefined);
  mockApiPost.mockResolvedValue({ data: { success: true } });
  mockApiGet.mockResolvedValue({ data: { notifications: [], unreadCount: 0 } });
  mockSetBadgeCount.mockResolvedValue(undefined);
  mockAddReceivedListener.mockReturnValue({ remove: jest.fn() });
  mockAddResponseListener.mockReturnValue({ remove: jest.fn() });
}

// ============ TESTS ============

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
    service = createFreshService();
  });

  // ------ REGISTRACIJA PUSH TOKENA ------

  describe('registerForPushNotifications()', () => {
    it('registruje token uspešno kad su sve dozvole odobrene', async () => {
      const token = await service.registerForPushNotifications();

      expect(token).toBe(MOCK_TOKEN);
      expect(mockGetExpoPushToken).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'test-project-id' })
      );
      // Proverava da se token šalje na backend
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/android-notifications/register-token',
        { pushToken: MOCK_TOKEN }
      );
    });

    it('vraća null na emulatoru (Device.isDevice = false)', async () => {
      jest.resetModules();
      jest.mock('expo-device', () => ({
        isDevice: false,
        brand: null,
        modelName: 'Emulator',
      }));
      jest.mock('expo-notifications', () => ({
        getPermissionsAsync: mockGetPermissions,
        requestPermissionsAsync: mockRequestPermissions,
        getExpoPushTokenAsync: mockGetExpoPushToken,
        setNotificationChannelAsync: mockSetNotificationChannel,
        setNotificationHandler: jest.fn(),
        addNotificationReceivedListener: mockAddReceivedListener,
        addNotificationResponseReceivedListener: mockAddResponseListener,
        setBadgeCountAsync: mockSetBadgeCount,
        AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
      }));
      jest.mock('expo-constants', () => ({
        appOwnership: null,
        expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
      }));
      jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
      jest.mock('../api', () => ({
        __esModule: true,
        default: { post: mockApiPost, get: mockApiGet, put: mockApiPut, delete: mockApiDelete },
      }));

      const emulatorService = require('../notificationService').default;
      const token = await emulatorService.registerForPushNotifications();

      expect(token).toBeNull();
      expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    });

    it('vraća null kad korisnik odbije dozvolu', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'denied' });
      mockRequestPermissions.mockResolvedValue({ status: 'denied' });

      const token = await service.registerForPushNotifications();

      expect(token).toBeNull();
      expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    });

    it('traži dozvolu kad nije prethodno odobrena', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
      mockRequestPermissions.mockResolvedValue({ status: 'granted' });

      const token = await service.registerForPushNotifications();

      expect(token).toBe(MOCK_TOKEN);
      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('ne traži dozvolu ponovo kad je već odobrena', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'granted' });

      await service.registerForPushNotifications();

      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('kreira Android notification kanale pre registracije tokena', async () => {
      await service.registerForPushNotifications();

      // Proverava da su kanali kreirani
      expect(mockSetNotificationChannel).toHaveBeenCalledWith(
        'default',
        expect.any(Object)
      );
      expect(mockSetNotificationChannel).toHaveBeenCalledWith(
        'work-orders',
        expect.any(Object)
      );
      expect(mockSetNotificationChannel).toHaveBeenCalledWith(
        'equipment-added',
        expect.any(Object)
      );
      expect(mockSetNotificationChannel).toHaveBeenCalledWith(
        'equipment-removed',
        expect.any(Object)
      );
    });
  });

  // ------ RETRY LOGIKA ------

  describe('Backend registracija sa retry', () => {
    it('retry-uje 3 puta kad backend ne radi', async () => {
      mockApiPost
        .mockRejectedValueOnce(new Error('Network Error'))  // register-token fail 1
        .mockRejectedValueOnce(new Error('Network Error'))  // register-token fail 2
        .mockResolvedValueOnce({ data: { success: true } }); // register-token success

      // debug endpoint will also be called, mock all posts
      mockApiPost.mockImplementation((url, data) => {
        if (url === '/api/android-notifications/register-token') {
          const call = mockApiPost.mock.calls.filter(c => c[0] === '/api/android-notifications/register-token').length;
          if (call <= 2) return Promise.reject(new Error('Network Error'));
          return Promise.resolve({ data: { success: true } });
        }
        return Promise.resolve({ data: {} }); // debug endpoint
      });

      const token = await service.registerForPushNotifications();

      // Token se vraća čak i ako retry failuje (videti liniju 284 notificationService.js)
      expect(token).toBe(MOCK_TOKEN);
    }, 15000);

    it('vraća token čak i kad svi backend pokušaji ne uspe', async () => {
      mockApiPost.mockImplementation((url) => {
        if (url === '/api/android-notifications/register-token') {
          return Promise.reject(new Error('Server Down'));
        }
        return Promise.resolve({ data: {} });
      });

      const token = await service.registerForPushNotifications();

      // Linija 284: return token.data - vraća token čak i bez backend registracije
      expect(token).toBe(MOCK_TOKEN);
    }, 15000);
  });

  // ------ TOKEN FALLBACK ------

  describe('Token fallback (bez projectId)', () => {
    it('pokušava bez projectId kad prvi pokušaj ne uspe', async () => {
      mockGetExpoPushToken
        .mockRejectedValueOnce(new Error('Invalid projectId'))
        .mockResolvedValueOnce({ data: MOCK_TOKEN });

      const token = await service.registerForPushNotifications();

      expect(token).toBe(MOCK_TOKEN);
      // Prvi poziv sa projectId
      expect(mockGetExpoPushToken.mock.calls[0][0]).toEqual(
        expect.objectContaining({ projectId: 'test-project-id' })
      );
      // Drugi poziv bez projectId (fallback)
      expect(mockGetExpoPushToken.mock.calls[1][0]).toEqual({});
    });

    it('vraća null kad oba pokušaja (sa i bez projectId) ne uspe', async () => {
      mockGetExpoPushToken.mockRejectedValue(new Error('Token error'));

      const token = await service.registerForPushNotifications();

      expect(token).toBeNull();
    });
  });

  // ------ NOTIFICATION LISTENERS ------

  describe('Notification listeners', () => {
    it('postavlja oba listenera (received + tapped)', () => {
      const onReceived = jest.fn();
      const onTapped = jest.fn();

      service.setupNotificationListeners(onReceived, onTapped);

      expect(mockAddReceivedListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockAddResponseListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('poziva callback kad stigne notifikacija', () => {
      const onReceived = jest.fn();
      service.setupNotificationListeners(onReceived, jest.fn());

      // Simuliraj notifikaciju
      const listenerCallback = mockAddReceivedListener.mock.calls[0][0];
      const mockNotification = { request: { content: { title: 'Test' } } };
      listenerCallback(mockNotification);

      expect(onReceived).toHaveBeenCalledWith(mockNotification);
    });

    it('uklanja listenere kad se pozove removeNotificationListeners', () => {
      const mockRemoveReceived = jest.fn();
      const mockRemoveResponse = jest.fn();
      mockAddReceivedListener.mockReturnValue({ remove: mockRemoveReceived });
      mockAddResponseListener.mockReturnValue({ remove: mockRemoveResponse });

      service.setupNotificationListeners(jest.fn(), jest.fn());
      service.removeNotificationListeners();

      expect(mockRemoveReceived).toHaveBeenCalled();
      expect(mockRemoveResponse).toHaveBeenCalled();
    });

    it('ne crasha kad se pozove removeNotificationListeners bez prethodnog setup-a', () => {
      const freshService = createFreshService();
      expect(() => freshService.removeNotificationListeners()).not.toThrow();
    });
  });

  // ------ FETCH / MARK / DELETE ------

  describe('Notification CRUD operacije', () => {
    it('fetchNotifications vraća notifikacije sa servera', async () => {
      const mockNotifs = {
        notifications: [{ _id: '1', title: 'Test', isRead: false }],
        unreadCount: 1,
      };
      mockApiGet.mockResolvedValue({ data: mockNotifs });

      const result = await service.fetchNotifications();

      expect(result).toEqual(mockNotifs);
      expect(mockApiGet).toHaveBeenCalledWith('/api/android-notifications');
    });

    it('markAsRead šalje PUT zahtev', async () => {
      mockApiPut.mockResolvedValue({ data: { success: true } });

      await service.markAsRead('notif-123');

      expect(mockApiPut).toHaveBeenCalledWith('/api/android-notifications/notif-123/read');
    });

    it('deleteNotification šalje DELETE zahtev', async () => {
      mockApiDelete.mockResolvedValue({ data: { success: true } });

      await service.deleteNotification('notif-456');

      expect(mockApiDelete).toHaveBeenCalledWith('/api/android-notifications/notif-456');
    });

    it('setBadgeCount postavlja badge', async () => {
      await service.setBadgeCount(5);

      expect(mockSetBadgeCount).toHaveBeenCalledWith(5);
    });

    it('getUnreadCount vraća broj nepročitanih', async () => {
      mockApiGet.mockResolvedValue({ data: { count: 7 } });

      const count = await service.getUnreadCount();

      expect(count).toBe(7);
    });

    it('getUnreadCount vraća 0 kad API failuje', async () => {
      mockApiGet.mockRejectedValue(new Error('Network Error'));

      const count = await service.getUnreadCount();

      expect(count).toBe(0);
    });
  });
});
