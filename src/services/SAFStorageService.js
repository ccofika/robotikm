/**
 * SAF Storage Service - Storage Access Framework za Android 11+ (API 30+)
 *
 * VAŽNO: expo-file-system StorageAccessFramework NE MOŽE da čita poddirektorijume!
 * Zato koristimo react-native-saf-x koji pravilno podržava rekurzivno čitanje.
 *
 * Korisnik jednom bira ACRPhone folder, posle toga je pristup trajan.
 *
 * Struktura ACRPhone foldera:
 * ACRPhone/
 *   └── 2025/
 *       └── 12/
 *           └── 14/
 *               └── +381691716463/
 *                   └── recording.m4a
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
// SDK 54: koristi legacy API umesto novog
import * as FileSystem from 'expo-file-system/legacy';

const isExpoGo = Constants.appOwnership === 'expo';

// Storage keys
const SAF_URI_KEY = 'saf_acr_phone_uri';
const SAF_SETUP_COMPLETED_KEY = 'saf_setup_completed';

// Dinamicki ucitaj react-native-saf-x (samo u development buildu)
let SAF = null;
if (!isExpoGo && Platform.OS === 'android') {
  try {
    SAF = require('react-native-saf-x');
    console.log('[SAF Service] react-native-saf-x loaded successfully');
  } catch (e) {
    console.warn('[SAF Service] react-native-saf-x not available:', e.message);
    console.warn('[SAF Service] SAF functionality will NOT work without this library!');
  }
}

class SAFStorageService {
  constructor() {
    this.isAvailable = Platform.OS === 'android' && !isExpoGo && SAF !== null;
    this.safUri = null;
    this.isInitialized = false;

    if (!this.isAvailable && Platform.OS === 'android' && !isExpoGo) {
      console.error('[SAF Service] CRITICAL: react-native-saf-x is required for Android 11+!');
      console.error('[SAF Service] Run: npm install react-native-saf-x');
      console.error('[SAF Service] Then: npx expo prebuild --clean && npx expo run:android');
    }
  }

  /**
   * Inicijalizacija servisa - ucitaj sacuvani SAF URI
   */
  async initialize() {
    if (!this.isAvailable) {
      console.log('[SAF Service] Not available (not Android, Expo Go, or SAF library missing)');
      return false;
    }

    try {
      const savedUri = await AsyncStorage.getItem(SAF_URI_KEY);
      if (savedUri) {
        console.log('[SAF Service] Found saved URI, checking permission...');

        // Proveri da li je permission jos uvek validan
        const hasPermission = await this.checkPermission(savedUri);
        if (hasPermission) {
          this.safUri = savedUri;
          this.isInitialized = true;
          console.log('[SAF Service] ✅ Initialized with saved URI');
          return true;
        } else {
          console.log('[SAF Service] ⚠️ Saved URI no longer valid, clearing');
          await this.clearSavedUri();
        }
      } else {
        console.log('[SAF Service] No saved URI found');
      }
      return false;
    } catch (error) {
      console.error('[SAF Service] Initialize error:', error);
      return false;
    }
  }

  /**
   * Proveri da li imamo permission za dati URI koristeći react-native-saf-x
   */
  async checkPermission(uri) {
    if (!SAF) {
      console.error('[SAF Service] Cannot check permission - SAF library not loaded');
      return false;
    }

    try {
      const hasPermission = await SAF.hasPermission(uri);
      console.log('[SAF Service] Permission check for URI:', hasPermission);
      return hasPermission;
    } catch (e) {
      console.error('[SAF Service] Permission check error:', e);
      return false;
    }
  }

  /**
   * Dobij listu perzistiranih permisija
   */
  async getPersistedPermissions() {
    if (!SAF) return [];

    try {
      const permissions = await SAF.getPersistedUriPermissions();
      console.log('[SAF Service] Persisted permissions:', permissions);
      return permissions;
    } catch (e) {
      console.error('[SAF Service] getPersistedPermissions error:', e);
      return [];
    }
  }

  /**
   * Prikaži dijalog za izbor foldera
   * Korisnik treba da navigira do: storage/Recordings/ACRPhone
   */
  async requestFolderAccess() {
    if (!this.isAvailable) {
      console.log('[SAF Service] Not available');
      Alert.alert(
        'Greška',
        'SAF nije dostupan. Proverite da li je react-native-saf-x instaliran i da koristite development build.',
        [{ text: 'OK' }]
      );
      return null;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Dozvola za snimke poziva',
        'Da bi aplikacija mogla da uploaduje snimke poziva, potrebno je da izaberete ACRPhone folder.\n\n' +
        '📁 Navigirajte do:\n' +
        '   Internal Storage\n' +
        '   └── Recordings\n' +
        '       └── ACRPhone  ← izaberite ovaj folder\n\n' +
        'Zatim kliknite "USE THIS FOLDER" ili "KORISTI OVAJ FOLDER" i potvrdite.',
        [
          {
            text: 'Izaberi folder',
            onPress: async () => {
              const result = await this.openFolderPicker();
              resolve(result);
            }
          },
          {
            text: 'Kasnije',
            style: 'cancel',
            onPress: () => resolve(null)
          }
        ]
      );
    });
  }

  /**
   * Otvori folder picker koristeći react-native-saf-x
   */
  async openFolderPicker() {
    if (!SAF) {
      console.error('[SAF Service] Cannot open folder picker - SAF library not loaded');
      return null;
    }

    try {
      console.log('[SAF Service] Opening document tree picker...');

      // persist=true čuva permisiju trajno
      const doc = await SAF.openDocumentTree(true);

      if (doc && doc.uri) {
        console.log('[SAF Service] Folder selected:');
        console.log('[SAF Service]   - URI:', doc.uri);
        console.log('[SAF Service]   - Name:', doc.name);

        // Proveri da li je izabran ACRPhone folder
        // URI može biti u formatu: content://com.android.externalstorage.documents/tree/primary%3ARecordings%2FACRPhone
        const isACRPhone = doc.name === 'ACRPhone' ||
                           doc.uri.includes('ACRPhone') ||
                           doc.uri.includes('ACRPhone'.toLowerCase());

        if (isACRPhone) {
          await this.saveSafUri(doc.uri);
          this.safUri = doc.uri;
          this.isInitialized = true;

          console.log('[SAF Service] ✅ ACRPhone folder access granted!');

          // Testiraj pristup
          const testFiles = await this.listFiles(doc.uri);
          console.log('[SAF Service] Test - found', testFiles.length, 'items in root');

          return doc.uri;
        } else {
          console.log('[SAF Service] ❌ Wrong folder selected:', doc.name);
          Alert.alert(
            'Pogrešan folder',
            `Izabrali ste: "${doc.name}"\n\nMolimo izaberite ACRPhone folder koji se nalazi u:\n\nInternal Storage → Recordings → ACRPhone`,
            [{ text: 'OK' }]
          );
          return null;
        }
      } else {
        console.log('[SAF Service] User cancelled folder selection');
        return null;
      }
    } catch (error) {
      console.error('[SAF Service] openFolderPicker error:', error);
      Alert.alert('Greška', 'Došlo je do greške pri izboru foldera: ' + error.message);
      return null;
    }
  }

  /**
   * Sačuvaj SAF URI za buduće korišćenje
   */
  async saveSafUri(uri) {
    try {
      await AsyncStorage.setItem(SAF_URI_KEY, uri);
      await AsyncStorage.setItem(SAF_SETUP_COMPLETED_KEY, 'true');
      console.log('[SAF Service] URI saved to AsyncStorage');
    } catch (error) {
      console.error('[SAF Service] saveSafUri error:', error);
    }
  }

  /**
   * Obriši sačuvani URI
   */
  async clearSavedUri() {
    try {
      await AsyncStorage.removeItem(SAF_URI_KEY);
      await AsyncStorage.removeItem(SAF_SETUP_COMPLETED_KEY);
      this.safUri = null;
      this.isInitialized = false;
      console.log('[SAF Service] URI cleared');
    } catch (error) {
      console.error('[SAF Service] clearSavedUri error:', error);
    }
  }

  /**
   * Proveri da li je setup završen
   */
  async isSetupCompleted() {
    try {
      const completed = await AsyncStorage.getItem(SAF_SETUP_COMPLETED_KEY);
      return completed === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Listaj fajlove u folderu koristeći react-native-saf-x
   *
   * VAŽNO: react-native-saf-x vraća objekte sa:
   * - uri: string
   * - name: string
   * - type: "directory" | "file"  (NE isDirectory!)
   * - size: number
   * - lastModified: number
   * - mime: string
   */
  async listFiles(uri = null) {
    const targetUri = uri || this.safUri;
    if (!targetUri) {
      console.log('[SAF Service] No URI available for listFiles');
      return [];
    }

    if (!SAF) {
      console.error('[SAF Service] Cannot list files - SAF library not loaded');
      return [];
    }

    try {
      const files = await SAF.listFiles(targetUri);

      // Konvertuj type u isDirectory za lakše korišćenje
      return files.map(file => ({
        ...file,
        isDirectory: file.type === 'directory'
      }));
    } catch (error) {
      console.error('[SAF Service] listFiles error for URI:', targetUri);
      console.error('[SAF Service] Error:', error);
      return [];
    }
  }

  /**
   * Skeniraj ACRPhone strukturu za snimke
   * Struktura: ACRPhone/YYYY/MM/DD/+phoneNumber/filename.m4a
   *
   * @param {number} daysBack - koliko dana unazad skenirati (default 2)
   */
  async scanForRecordings(daysBack = 2) {
    if (!this.safUri) {
      console.log('[SAF Service] Cannot scan - not initialized');
      return [];
    }

    if (!SAF) {
      console.error('[SAF Service] Cannot scan - SAF library not loaded');
      return [];
    }

    const recordings = [];
    const now = new Date();

    try {
      console.log('[SAF Service] ========================================');
      console.log('[SAF Service] 🔍 Starting scan for recordings...');
      console.log('[SAF Service] Base URI:', this.safUri);
      console.log('[SAF Service] Days back:', daysBack);

      // Listaj godine (2024, 2025, itd.)
      const years = await this.listFiles(this.safUri);
      console.log('[SAF Service] Found', years.length, 'items in root');

      for (const yearFolder of years) {
        // Proveri da li je direktorijum i da li je godina
        if (!yearFolder.isDirectory) continue;

        const year = yearFolder.name;
        if (!/^\d{4}$/.test(year)) {
          console.log('[SAF Service] Skipping non-year folder:', year);
          continue;
        }

        console.log('[SAF Service] Scanning year:', year);

        // Listaj mesece
        const months = await this.listFiles(yearFolder.uri);

        for (const monthFolder of months) {
          if (!monthFolder.isDirectory) continue;

          const month = monthFolder.name;
          if (!/^\d{1,2}$/.test(month)) continue;

          // Listaj dane
          const days = await this.listFiles(monthFolder.uri);

          for (const dayFolder of days) {
            if (!dayFolder.isDirectory) continue;

            const day = dayFolder.name;
            if (!/^\d{1,2}$/.test(day)) continue;

            // Proveri da li je u opsegu dana koje trazimo
            const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const daysDiff = Math.floor((now - folderDate) / (1000 * 60 * 60 * 24));

            if (daysDiff > daysBack) {
              continue; // Preskoči starije foldere
            }

            console.log('[SAF Service] Scanning date:', `${year}/${month}/${day}`);

            // Listaj phone foldere
            const phoneFolders = await this.listFiles(dayFolder.uri);

            for (const phoneFolder of phoneFolders) {
              if (!phoneFolder.isDirectory) continue;

              // Proveri da li je folder sa brojem telefona (+381... ili 381...)
              const phoneRegex = /^\+?\d{10,15}$/;
              if (!phoneRegex.test(phoneFolder.name)) {
                console.log('[SAF Service] Skipping non-phone folder:', phoneFolder.name);
                continue;
              }

              console.log('[SAF Service] Found phone folder:', phoneFolder.name);

              // Listaj audio fajlove
              const files = await this.listFiles(phoneFolder.uri);

              for (const file of files) {
                if (file.isDirectory) continue;
                if (!this.isAudioFile(file.name)) continue;

                console.log('[SAF Service] Found recording:', file.name);

                recordings.push({
                  uri: file.uri,
                  fileName: file.name,
                  customerPhone: phoneFolder.name,
                  recordDate: folderDate,
                  year,
                  month,
                  day,
                  fileSize: file.size || 0,
                  lastModified: file.lastModified,
                  mime: file.mime
                });
              }
            }
          }
        }
      }

      console.log('[SAF Service] ========================================');
      console.log('[SAF Service] ✅ Scan complete!');
      console.log('[SAF Service] Total recordings found:', recordings.length);
      console.log('[SAF Service] ========================================');

      return recordings;

    } catch (error) {
      console.error('[SAF Service] ❌ scanForRecordings error:', error);
      return [];
    }
  }

  /**
   * Čitaj fajl kao base64 koristeći react-native-saf-x
   */
  async readFileAsBase64(uri) {
    if (!SAF) {
      console.error('[SAF Service] Cannot read file - SAF library not loaded');
      return null;
    }

    try {
      const content = await SAF.readFile(uri, { encoding: 'base64' });
      return content;
    } catch (error) {
      console.error('[SAF Service] readFileAsBase64 error:', error);
      return null;
    }
  }

  /**
   * Kopiraj fajl u app cache directory (za upload)
   *
   * react-native-saf-x copyFile radi samo između SAF URI-ja,
   * pa moramo koristiti readFile + writeFile pristup
   */
  async copyFileToCache(uri, fileName) {
    if (!SAF) {
      throw new Error('SAF biblioteka nije učitana');
    }

    // Koristi expo-file-system legacy cache directory
    const destPath = FileSystem.cacheDirectory + fileName;

    console.log('[SAF Service] Copying file to cache...');
    console.log('[SAF Service]   From:', uri);
    console.log('[SAF Service]   To:', destPath);

    // Čitaj fajl kao base64 koristeći SAF
    let base64Content;
    try {
      base64Content = await SAF.readFile(uri, { encoding: 'base64' });
    } catch (readError) {
      console.error('[SAF Service] Failed to read file:', readError);
      throw new Error(`Greška pri čitanju fajla: ${readError.message}`);
    }

    if (!base64Content) {
      throw new Error('SAF.readFile vratio prazan sadržaj');
    }

    console.log('[SAF Service] Read base64 content, length:', base64Content.length);

    // Piši u cache koristeći expo-file-system legacy API
    try {
      await FileSystem.writeAsStringAsync(destPath, base64Content, {
        encoding: FileSystem.EncodingType.Base64
      });
    } catch (writeError) {
      console.error('[SAF Service] Failed to write file:', writeError);
      throw new Error(`Greška pri pisanju u cache: ${writeError.message}`);
    }

    console.log('[SAF Service] ✅ File copied successfully');

    // Verifikuj
    const info = await FileSystem.getInfoAsync(destPath);
    if (!info.exists) {
      throw new Error('Fajl nije kreiran u cache direktorijumu');
    }

    console.log('[SAF Service] Copied file size:', info.size, 'bytes');

    if (info.size === 0) {
      throw new Error('Kopirani fajl ima veličinu 0 bajtova');
    }

    return destPath;
  }

  /**
   * Dobij statistiku o fajlu
   */
  async getFileStat(uri) {
    if (!SAF) {
      console.error('[SAF Service] Cannot get stat - SAF library not loaded');
      return null;
    }

    try {
      const stat = await SAF.stat(uri);
      return {
        ...stat,
        isDirectory: stat.type === 'directory'
      };
    } catch (error) {
      console.error('[SAF Service] getFileStat error:', error);
      return null;
    }
  }

  /**
   * Proveri da li je fajl audio
   */
  isAudioFile(fileName) {
    if (!fileName) return false;
    const audioExtensions = ['.m4a', '.mp3', '.wav', '.3gp', '.aac', '.ogg', '.amr'];
    const lowerName = fileName.toLowerCase();
    return audioExtensions.some(ext => lowerName.endsWith(ext));
  }

  /**
   * Izvuci ime fajla iz URI-ja
   */
  getFileNameFromUri(uri) {
    if (!uri) return '';
    const parts = uri.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart);
  }

  /**
   * Status report
   */
  getStatus() {
    return {
      isAvailable: this.isAvailable,
      isInitialized: this.isInitialized,
      hasUri: !!this.safUri,
      safUri: this.safUri,
      safLibraryLoaded: SAF !== null
    };
  }
}

export default new SAFStorageService();
