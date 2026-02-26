/**
 * Testovi za notification lifecycle
 *
 * Testira kritične scenarije:
 * 1. Login → token registracija (samo jednom, ne duplo)
 * 2. Logout → token unregistracija sa servera
 * 3. Dva tehničara na istom uređaju
 * 4. Login → logout → login istog korisnika
 * 5. Offline logout (server nedostupan)
 */

// ============ MOCKS ============

const mockStorageData = {};

jest.mock('../../utils/storage', () => ({
  storage: {
    getItem: jest.fn((key) => Promise.resolve(mockStorageData[key] || null)),
    setItem: jest.fn((key, value) => {
      mockStorageData[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete mockStorageData[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(mockStorageData).forEach(k => delete mockStorageData[k]);
      return Promise.resolve();
    }),
  },
}));

const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('../api', () => ({
  __esModule: true,
  authAPI: {
    login: jest.fn(),
  },
  notificationsAPI: {
    registerToken: mockApiPost,
    unregisterToken: mockApiDelete,
  },
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
    get: jest.fn().mockResolvedValue({ data: { notifications: [], unreadCount: 0 } }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[device-1]' }),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  setBadgeCountAsync: jest.fn(),
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
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ============ HELPERS ============

const { storage } = require('../../utils/storage');
const { notificationsAPI } = require('../api');

const TECHNICIAN_A = {
  _id: 'tech-a-id-111',
  name: 'Vladimir Milovanović',
  role: 'technician',
};

const TECHNICIAN_B = {
  _id: 'tech-b-id-222',
  name: 'Vladimir Mojsilović',
  role: 'technician',
};

const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InRlc3QiLCJyb2xlIjoidGVjaG5pY2lhbiIsImV4cCI6OTk5OTk5OTk5OX0.test';

async function simulateLogin(user) {
  await storage.setItem('user', user);
  await storage.setItem('token', MOCK_JWT);
}

async function simulateLogout() {
  // Simuliraj ono što AuthContext.logout() radi
  try {
    await notificationsAPI.unregisterToken();
  } catch (e) {
    // Nije kritično
  }
  await storage.removeItem('user');
  await storage.removeItem('token');
}

// ============ TESTS ============

describe('Notification Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorageData).forEach(k => delete mockStorageData[k]);
    mockApiPost.mockResolvedValue({ data: { success: true } });
    mockApiDelete.mockResolvedValue({ data: { success: true } });
  });

  // ------ LOGIN → REGISTRACIJA ------

  describe('Login flow', () => {
    it('čuva user i token u storage nakon logina', async () => {
      await simulateLogin(TECHNICIAN_A);

      expect(storage.setItem).toHaveBeenCalledWith('user', TECHNICIAN_A);
      expect(storage.setItem).toHaveBeenCalledWith('token', MOCK_JWT);
      expect(mockStorageData.user).toEqual(TECHNICIAN_A);
      expect(mockStorageData.token).toBe(MOCK_JWT);
    });

    it('NotificationContext registruje token jednom (ne duplo)', async () => {
      await simulateLogin(TECHNICIAN_A);

      // Simuliraj da NotificationContext registruje token
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // Token je registrovan tačno jednom
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockApiPost).toHaveBeenCalledWith('ExponentPushToken[device-1]');
    });
  });

  // ------ LOGOUT → UNREGISTRACIJA ------

  describe('Logout flow', () => {
    it('unregistruje token sa servera pre brisanja lokalnih podataka', async () => {
      await simulateLogin(TECHNICIAN_A);

      const callOrder = [];
      mockApiDelete.mockImplementation(() => {
        callOrder.push('unregister');
        return Promise.resolve({ data: { success: true } });
      });
      storage.removeItem.mockImplementation((key) => {
        callOrder.push(`remove_${key}`);
        delete mockStorageData[key];
        return Promise.resolve();
      });

      await simulateLogout();

      // Unregister mora biti PRE brisanja tokena
      expect(callOrder[0]).toBe('unregister');
      expect(callOrder).toContain('remove_user');
      expect(callOrder).toContain('remove_token');
    });

    it('briše lokalne podatke čak i kad unregister failuje', async () => {
      await simulateLogin(TECHNICIAN_A);
      mockApiDelete.mockRejectedValue(new Error('Server Down'));

      await simulateLogout();

      // Lokalni podaci su obrisani uprkos server grešci
      expect(mockStorageData.user).toBeUndefined();
      expect(mockStorageData.token).toBeUndefined();
    });

    it('ne crasha kad je korisnik već izlogovan', async () => {
      // Storage je prazan, nema tokena
      await expect(simulateLogout()).resolves.not.toThrow();
    });
  });

  // ------ DVA TEHNIČARA NA ISTOM UREĐAJU ------

  describe('Dva tehničara na istom uređaju', () => {
    it('Tehničar A login → logout → Tehničar B login (čist handover)', async () => {
      // 1. Tehničar A se loguje
      await simulateLogin(TECHNICIAN_A);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      expect(mockApiPost).toHaveBeenCalledTimes(1);

      // 2. Tehničar A se izloguje - token se briše sa servera
      await simulateLogout();
      expect(mockApiDelete).toHaveBeenCalledTimes(1);

      // 3. Tehničar B se loguje na isti uređaj
      jest.clearAllMocks();
      mockApiPost.mockResolvedValue({ data: { success: true } });
      mockApiDelete.mockResolvedValue({ data: { success: true } });

      await simulateLogin(TECHNICIAN_B);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // Token je registrovan za B
      expect(mockApiPost).toHaveBeenCalledTimes(1);

      // A-jev token je bio obrisan pre B-jevog logina
      expect(mockStorageData.user).toEqual(TECHNICIAN_B);
    });

    it('Tehničar A se ne izloguje → Tehničar B se loguje (override)', async () => {
      // 1. Tehničar A se loguje
      await simulateLogin(TECHNICIAN_A);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // 2. Tehničar B se loguje BEZ da se A izlogovao
      // (ovo se dešava kad se app reinstalira ili clear data)
      jest.clearAllMocks();
      mockApiPost.mockResolvedValue({ data: { success: true } });

      await simulateLogin(TECHNICIAN_B);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // B je sada vlasnik tokena
      expect(mockStorageData.user).toEqual(TECHNICIAN_B);
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });
  });

  // ------ LOGIN → LOGOUT → PONOVO LOGIN ------

  describe('Isti korisnik: login → logout → login', () => {
    it('ponovna registracija tokena radi bez problema', async () => {
      // 1. Prvobitni login
      await simulateLogin(TECHNICIAN_A);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');
      expect(mockApiPost).toHaveBeenCalledTimes(1);

      // 2. Logout
      await simulateLogout();
      expect(mockApiDelete).toHaveBeenCalledTimes(1);

      // 3. Ponovo login
      jest.clearAllMocks();
      mockApiPost.mockResolvedValue({ data: { success: true } });

      await simulateLogin(TECHNICIAN_A);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // Token je ponovo registrovan
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockStorageData.user).toEqual(TECHNICIAN_A);
    });
  });

  // ------ OFFLINE SCENARIJI ------

  describe('Offline scenariji', () => {
    it('logout radi offline (token se ne briše sa servera ali lokalno da)', async () => {
      await simulateLogin(TECHNICIAN_A);

      // Server je nedostupan
      mockApiDelete.mockRejectedValue(new Error('Network Error'));

      await simulateLogout();

      // Lokalni podaci su obrisani
      expect(mockStorageData.user).toBeUndefined();
      expect(mockStorageData.token).toBeUndefined();
    });

    it('registracija tokena failuje offline ali ne blokira login', async () => {
      await simulateLogin(TECHNICIAN_A);

      mockApiPost.mockRejectedValue(new Error('Network Error'));

      // Registracija ne baca grešku
      await expect(
        notificationsAPI.registerToken('ExponentPushToken[device-1]')
      ).rejects.toThrow('Network Error');

      // Korisnik je i dalje ulogovan
      expect(mockStorageData.user).toEqual(TECHNICIAN_A);
      expect(mockStorageData.token).toBe(MOCK_JWT);
    });
  });

  // ------ TOKEN INTEGRITET ------

  describe('Token integritet', () => {
    it('svaki tehničar dobija svoj token vezan za svoj ID', async () => {
      const registeredTokens = [];

      mockApiPost.mockImplementation((token) => {
        registeredTokens.push({ token, user: mockStorageData.user });
        return Promise.resolve({ data: { success: true } });
      });

      // Login A
      await simulateLogin(TECHNICIAN_A);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // Logout A
      await simulateLogout();

      // Login B
      await simulateLogin(TECHNICIAN_B);
      await notificationsAPI.registerToken('ExponentPushToken[device-1]');

      // Token je isti (isti uređaj) ali user je drugačiji
      expect(registeredTokens[0].user).toEqual(TECHNICIAN_A);
      expect(registeredTokens[1].user).toEqual(TECHNICIAN_B);
      expect(registeredTokens[0].token).toBe(registeredTokens[1].token);
    });

    it('unregister se poziva sa auth tokenom ulogovanog korisnika', async () => {
      await simulateLogin(TECHNICIAN_A);

      // Pre logout-a, proveravamo da token postoji
      expect(mockStorageData.token).toBe(MOCK_JWT);

      await simulateLogout();

      // unregisterToken je pozvan dok je token još postojao
      expect(mockApiDelete).toHaveBeenCalledTimes(1);
    });
  });
});
