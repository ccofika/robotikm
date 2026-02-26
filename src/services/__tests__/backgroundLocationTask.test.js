/**
 * Testovi za background location task
 *
 * Testira:
 * 1. Task se registruje u globalnom scope-u
 * 2. Task šalje lokaciju na server kad dobije podatke
 * 3. Task ne šalje ništa ako nema auth token
 * 4. Task gracefully handluje greške (network, itd)
 * 5. Task radi i kad aplikacija nije aktivna (simulacija background executiona)
 */

// ============ MOCKS ============

// Mock expo-task-manager
const mockDefineTask = jest.fn();
jest.mock('expo-task-manager', () => ({
  defineTask: mockDefineTask,
}));

// Mock axios
const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  post: mockAxiosPost,
}));

// Mock expo-sqlite/kv-store (AsyncStorage replacement)
const mockGetItem = jest.fn();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
  },
}));

// Mock api.js za API_URL
jest.mock('../api', () => ({
  API_URL: 'https://test-api.example.com',
}));

// ============ HELPERS ============

const MOCK_LOCATION = {
  coords: {
    latitude: 44.8176,
    longitude: 20.4633,
    accuracy: 15.5,
    altitude: 117,
    speed: 2.3,
    heading: 45,
  },
  timestamp: 1708934400000, // Fixed timestamp
};

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';

function getRegisteredTaskCallback() {
  // Importuj modul da triggeruješ defineTask poziv
  require('../backgroundLocationTask');
  expect(mockDefineTask).toHaveBeenCalledWith(
    'BACKGROUND_LOCATION_TRACKING',
    expect.any(Function)
  );
  return mockDefineTask.mock.calls[0][1];
}

// ============ TESTS ============

describe('BackgroundLocationTask', () => {
  let taskCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Resetuj mock implementacije
    mockAxiosPost.mockResolvedValue({ data: { success: true } });
    mockGetItem.mockResolvedValue(JSON.stringify(MOCK_TOKEN));
  });

  // ------ TASK REGISTRATION ------

  describe('Task Registration', () => {
    it('registruje task sa ispravnim imenom u globalnom scope-u', () => {
      taskCallback = getRegisteredTaskCallback();
      expect(mockDefineTask).toHaveBeenCalledTimes(1);
      expect(mockDefineTask.mock.calls[0][0]).toBe('BACKGROUND_LOCATION_TRACKING');
    });

    it('eksportuje BACKGROUND_LOCATION_TASK konstantu', () => {
      const { BACKGROUND_LOCATION_TASK } = require('../backgroundLocationTask');
      expect(BACKGROUND_LOCATION_TASK).toBe('BACKGROUND_LOCATION_TRACKING');
    });
  });

  // ------ USPEŠNO SLANJE LOKACIJE ------

  describe('Uspešno slanje lokacije', () => {
    beforeEach(() => {
      taskCallback = getRegisteredTaskCallback();
    });

    it('šalje lokaciju na server sa ispravnim podacima', async () => {
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://test-api.example.com/api/gps/location',
        expect.objectContaining({
          latitude: 44.8176,
          longitude: 20.4633,
          accuracy: 15.5,
          altitude: 117,
          speed: 2.3,
          heading: 45,
          requestType: 'background_tracking',
        }),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
      );
    });

    it('šalje deviceTimestamp kao ISO string', async () => {
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const sentData = mockAxiosPost.mock.calls[0][1];
      expect(sentData.deviceTimestamp).toBe(new Date(MOCK_LOCATION.timestamp).toISOString());
    });

    it('koristi requestType "background_tracking"', async () => {
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const sentData = mockAxiosPost.mock.calls[0][1];
      expect(sentData.requestType).toBe('background_tracking');
    });

    it('koristi Bearer token za autorizaciju', async () => {
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
    });
  });

  // ------ BEZ AUTH TOKENA ------

  describe('Bez auth tokena (korisnik nije ulogovan)', () => {
    beforeEach(() => {
      taskCallback = getRegisteredTaskCallback();
    });

    it('NE šalje lokaciju ako nema tokena u storage-u', async () => {
      mockGetItem.mockResolvedValue(null);

      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('NE šalje lokaciju ako je token prazan string', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify(''));

      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  // ------ GREŠKE ------

  describe('Handling grešaka', () => {
    beforeEach(() => {
      taskCallback = getRegisteredTaskCallback();
    });

    it('ne crasha kad task dobije error objekat', async () => {
      // Ovo simulira situaciju gde OS javlja grešku
      await expect(
        taskCallback({
          data: null,
          error: { message: 'Location services unavailable' },
        })
      ).resolves.not.toThrow();

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('ne crasha kad data je null', async () => {
      await expect(
        taskCallback({ data: null, error: null })
      ).resolves.not.toThrow();

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('ne crasha kad locations niz je prazan', async () => {
      await expect(
        taskCallback({ data: { locations: [] }, error: null })
      ).resolves.not.toThrow();

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('ne crasha kad network request failuje', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Network Error'));

      await expect(
        taskCallback({
          data: { locations: [MOCK_LOCATION] },
          error: null,
        })
      ).resolves.not.toThrow();
    });

    it('ne crasha kad server vrati 500', async () => {
      mockAxiosPost.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal Server Error' } },
        message: 'Request failed with status code 500',
      });

      await expect(
        taskCallback({
          data: { locations: [MOCK_LOCATION] },
          error: null,
        })
      ).resolves.not.toThrow();
    });

    it('ne crasha kad AsyncStorage baci grešku', async () => {
      mockGetItem.mockRejectedValue(new Error('Database locked'));

      await expect(
        taskCallback({
          data: { locations: [MOCK_LOCATION] },
          error: null,
        })
      ).resolves.not.toThrow();

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  // ------ SIMULACIJA BACKGROUND EXECUTION ------

  describe('Background execution (app nije aktivna)', () => {
    beforeEach(() => {
      taskCallback = getRegisteredTaskCallback();
    });

    it('radi bez React context-a (koristi direktno AsyncStorage)', async () => {
      // Ovo testira da task NE koristi React context ili API interceptore
      // već čita token direktno iz storage-a
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      // Mora da koristi AsyncStorage.getItem za token
      expect(mockGetItem).toHaveBeenCalledWith('token');

      // Mora da koristi raw axios, ne API instancu sa interceptorima
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/api/gps/location'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer '),
          }),
        })
      );
    });

    it('parsira JSON-wrapped token iz storage-a', async () => {
      // storage.js čuva: JSON.stringify(token) → '"actual-token"'
      mockGetItem.mockResolvedValue('"my-jwt-token-123"');

      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBe('Bearer my-jwt-token-123');
    });

    it('handluje raw (non-JSON) token iz storage-a', async () => {
      // Edge case: token nije JSON-wrapped
      mockGetItem.mockResolvedValue('raw-token-without-json');

      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBe('Bearer raw-token-without-json');
    });

    it('koristi prvi location iz niza (najnoviji)', async () => {
      const olderLocation = {
        ...MOCK_LOCATION,
        coords: { ...MOCK_LOCATION.coords, latitude: 45.0, longitude: 21.0 },
      };

      await taskCallback({
        data: { locations: [MOCK_LOCATION, olderLocation] },
        error: null,
      });

      const sentData = mockAxiosPost.mock.calls[0][1];
      expect(sentData.latitude).toBe(44.8176); // Mora biti prvi iz niza
      expect(sentData.longitude).toBe(20.4633);
    });

    it('šalje na apsolutni URL (ne zavisi od axios base URL instance)', async () => {
      await taskCallback({
        data: { locations: [MOCK_LOCATION] },
        error: null,
      });

      const url = mockAxiosPost.mock.calls[0][0];
      expect(url).toBe('https://test-api.example.com/api/gps/location');
      expect(url).toMatch(/^https?:\/\//); // Apsolutni URL
    });
  });

  // ------ TOKEN EXPIRY SCENARIO ------

  describe('Token istekao (simulacija dugog background rada)', () => {
    beforeEach(() => {
      taskCallback = getRegisteredTaskCallback();
    });

    it('handluje 401 Unauthorized gracefully', async () => {
      mockAxiosPost.mockRejectedValue({
        response: { status: 401, data: { error: 'Token expired' } },
        message: 'Request failed with status code 401',
      });

      await expect(
        taskCallback({
          data: { locations: [MOCK_LOCATION] },
          error: null,
        })
      ).resolves.not.toThrow();
    });
  });
});
