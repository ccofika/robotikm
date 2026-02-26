import AsyncStorage from 'expo-sqlite/kv-store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // ms

/**
 * Wrapper koji retry-uje operaciju ako je baza zaključana
 */
async function withRetry(operation, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLocked = error?.message?.includes('database is locked');
      if (isLocked && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      throw error;
    }
  }
}

export const storage = {
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await withRetry(() => AsyncStorage.setItem(key, jsonValue), `setItem(${key})`);
    } catch (error) {
      console.error(`[Storage] Error saving data for key "${key}":`, error);
      throw error;
    }
  },

  async getItem(key) {
    try {
      const jsonValue = await withRetry(() => AsyncStorage.getItem(key), `getItem(${key})`);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`[Storage] Error reading data for key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await withRetry(() => AsyncStorage.removeItem(key), `removeItem(${key})`);
    } catch (error) {
      console.error(`[Storage] Error removing data for key "${key}":`, error);
    }
  },

  async multiRemove(keys) {
    if (!keys || keys.length === 0) return;
    try {
      // Uklanjaj jedan po jedan da ne lockuješ bazu predugo
      for (const key of keys) {
        await withRetry(() => AsyncStorage.removeItem(key), `multiRemove(${key})`);
      }
    } catch (error) {
      console.error(`[Storage] Error removing multiple keys:`, error);
    }
  },

  async getAllKeys() {
    try {
      return await withRetry(() => AsyncStorage.getAllKeys(), 'getAllKeys');
    } catch (error) {
      console.error('[Storage] Error getting all keys:', error);
      return [];
    }
  },

  async clear() {
    try {
      await withRetry(() => AsyncStorage.clear(), 'clear');
    } catch (error) {
      console.error('[Storage] Error clearing data:', error);
    }
  }
};
