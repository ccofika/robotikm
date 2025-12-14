import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URL } from './api';

// Proveri da li app radi u Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Dinamički učitaj RNFS samo ako NIJE Expo Go
let RNFS = null;
if (!isExpoGo) {
  try {
    RNFS = require('react-native-fs');
  } catch (e) {
    console.warn('[ACR Watcher] react-native-fs not available:', e.message);
  }
}

class ACRPhoneRecordingWatcher {
  constructor() {
    // ACR Phone folder struktura
    this.basePath = RNFS ? RNFS.ExternalStorageDirectoryPath + '/Recordings/ACRPhone' : null;
    this.processedFiles = new Set();
    this.isWatching = false;
    this.watchInterval = null;
    this.scheduledInterval = null;
    this.technicianPhone = null;
    this.isAvailable = !isExpoGo && RNFS !== null;
    this.lastScheduledCheck = null;
  }

  async initialize(technicianPhoneNumber) {
    // Preskoči ako smo u Expo Go ili RNFS nije dostupan
    if (!this.isAvailable) {
      console.log('[ACR Watcher] Skipped - running in Expo Go or RNFS not available');
      return;
    }

    console.log('[ACR Watcher] ====================================');
    console.log('[ACR Watcher] Initializing with technician phone:', technicianPhoneNumber);

    if (!technicianPhoneNumber) {
      console.warn('[ACR Watcher] No technician phone number provided, watcher will not start');
      return;
    }

    this.technicianPhone = technicianPhoneNumber;

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      console.error('[ACR Watcher] Required permissions not granted');
      return;
    }

    await this.loadProcessedFiles();
    await this.startWatching();
    this.startScheduledChecks();
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return false;

    try {
      // Za Android 13+ (API 33+), READ_MEDIA_AUDIO ne daje pristup /Recordings/ACRPhone/
      // Potrebna je MANAGE_EXTERNAL_STORAGE permisija koju korisnik mora ručno odobriti u Settings

      if (Platform.Version >= 33) {
        // Na Android 13+, proveri da li imamo pristup svim fajlovima
        // MANAGE_EXTERNAL_STORAGE se ne može tražiti programski - korisnik mora ići u Settings
        console.log('[ACR Watcher] Android 13+ detected');
        console.log('[ACR Watcher] Checking if app has "All files access" permission...');

        // Probaj da pristupiš folderu - ako ne možemo, permisija nije data
        if (RNFS) {
          try {
            const testPath = RNFS.ExternalStorageDirectoryPath;
            const exists = await RNFS.exists(testPath);
            if (exists) {
              // Probaj da pročitaš sadržaj
              await RNFS.readDir(testPath);
              console.log('[ACR Watcher] ✅ All files access permission granted');
              return true;
            }
          } catch (e) {
            console.error('[ACR Watcher] ❌ Cannot access external storage');
            console.error('[ACR Watcher] User needs to grant "All files access" permission in Settings');

            // Prikaži Alert korisniku
            Alert.alert(
              'Potrebna dozvola',
              'Za sinhronizaciju snimaka poziva potrebno je odobriti pristup svim fajlovima.\n\nIdi u: Settings → Apps → Robotik Mobile → Permissions → Files and media → Allow management of all files',
              [
                { text: 'Otvori Settings', onPress: () => Linking.openSettings() },
                { text: 'Kasnije', style: 'cancel' }
              ]
            );
            return false;
          }
        }
        return false;
      }

      // Za Android 12 i starije - koristi klasične permisije
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        console.error('[ACR Watcher] Storage permissions not granted');
        console.log('[ACR Watcher] Granted permissions:', granted);
      } else {
        console.log('[ACR Watcher] ✅ All permissions granted');
      }

      return allGranted;
    } catch (error) {
      console.error('[ACR Watcher] Permission error:', error);
      return false;
    }
  }

  async loadProcessedFiles() {
    try {
      const stored = await AsyncStorage.getItem('processedACRRecordings');
      if (stored) {
        this.processedFiles = new Set(JSON.parse(stored));
        console.log('[ACR Watcher] Loaded', this.processedFiles.size, 'processed files');
      }
    } catch (error) {
      console.error('[ACR Watcher] Error loading processed files:', error);
    }
  }

  async saveProcessedFiles() {
    try {
      await AsyncStorage.setItem(
        'processedACRRecordings',
        JSON.stringify(Array.from(this.processedFiles))
      );
    } catch (error) {
      console.error('[ACR Watcher] Error saving processed files:', error);
    }
  }

  // Generiši putanje za danas i juče
  getTodayAndYesterdayPaths() {
    const paths = [];
    const now = new Date();

    // Danas
    const today = new Date(now);
    const todayPath = `${this.basePath}/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    paths.push({ path: todayPath, date: today });

    // Juče
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayPath = `${this.basePath}/${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;
    paths.push({ path: yesterdayPath, date: yesterday });

    console.log('[ACR Watcher] Paths to scan:');
    console.log('[ACR Watcher]   - Today:', todayPath);
    console.log('[ACR Watcher]   - Yesterday:', yesterdayPath);

    return paths;
  }

  // Kreiraj jedinstveni identifikator za fajl (folder + ime fajla)
  getFileUniqueId(filePath) {
    // Format: /storage/.../ACRPhone/2025/12/14/+381691716463/filename.m4a
    // Uzimamo samo poslednja 2 dela: folder sa brojem telefona + ime fajla
    const parts = filePath.split('/');
    if (parts.length >= 2) {
      const phoneFolder = parts[parts.length - 2];
      const fileName = parts[parts.length - 1];
      return `${phoneFolder}/${fileName}`;
    }
    return filePath;
  }

  async startWatching() {
    if (this.isWatching) {
      console.log('[ACR Watcher] Already watching');
      return;
    }

    console.log('[ACR Watcher] Starting to watch:', this.basePath);

    // Check if base folder exists
    try {
      const exists = await RNFS.exists(this.basePath);
      console.log('[ACR Watcher] ACR Phone folder exists:', exists);

      if (!exists) {
        console.error('[ACR Watcher] ❌ ACR Phone folder does not exist!');
        console.error('[ACR Watcher] Expected path:', this.basePath);
        console.error('[ACR Watcher] Please check:');
        console.error('[ACR Watcher] 1. Is ACR Phone app installed and configured?');
        console.error('[ACR Watcher] 2. Has ACR Phone recorded at least one call?');
        console.error('[ACR Watcher] 3. Are storage permissions granted?');
        return;
      }
    } catch (error) {
      console.error('[ACR Watcher] Error checking folder existence:', error);
      return;
    }

    this.isWatching = true;

    // Check immediately
    await this.scanForNewRecordings();

    // Check every 5 minutes (300000ms) instead of 30 seconds
    this.watchInterval = setInterval(() => {
      this.scanForNewRecordings();
    }, 300000);
  }

  // Scheduled checks at 12:00 and 00:00
  startScheduledChecks() {
    console.log('[ACR Watcher] Starting scheduled checks (12:00 and 00:00)');

    // Check every minute if it's time for scheduled scan
    this.scheduledInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check at 12:00 and 00:00
      if ((hours === 12 || hours === 0) && minutes === 0) {
        const checkKey = `${now.toDateString()}-${hours}`;

        // Prevent multiple runs in the same minute
        if (this.lastScheduledCheck !== checkKey) {
          this.lastScheduledCheck = checkKey;
          console.log(`[ACR Watcher] ⏰ Scheduled scan triggered at ${hours}:00`);
          this.manualSync();
        }
      }
    }, 60000); // Check every minute
  }

  stopWatching() {
    if (!this.isAvailable) return;

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    if (this.scheduledInterval) {
      clearInterval(this.scheduledInterval);
      this.scheduledInterval = null;
    }

    this.isWatching = false;
    console.log('[ACR Watcher] Stopped watching');
  }

  // Manual sync - može se pozvati iz UI
  async manualSync() {
    console.log('[ACR Watcher] ====================================');
    console.log('[ACR Watcher] 🔄 MANUAL SYNC STARTED');
    console.log('[ACR Watcher] ====================================');

    if (!this.isAvailable) {
      console.log('[ACR Watcher] Not available (Expo Go or RNFS missing)');
      return { success: false, message: 'Not available in Expo Go' };
    }

    try {
      const results = await this.scanForNewRecordings();
      await this.syncOfflineQueue();

      console.log('[ACR Watcher] ====================================');
      console.log('[ACR Watcher] ✅ MANUAL SYNC COMPLETED');
      console.log('[ACR Watcher] ====================================');

      return {
        success: true,
        message: 'Sync completed',
        ...results
      };
    } catch (error) {
      console.error('[ACR Watcher] Manual sync error:', error);
      return { success: false, message: error.message };
    }
  }

  async scanForNewRecordings() {
    console.log('[ACR Watcher] 🔍 Starting scan...');
    console.log('[ACR Watcher] Time:', new Date().toISOString());

    let scannedFiles = 0;
    let newFiles = 0;
    let skippedFiles = 0;

    try {
      const exists = await RNFS.exists(this.basePath);
      if (!exists) {
        console.log('[ACR Watcher] Base folder does not exist yet:', this.basePath);
        return { scannedFiles: 0, newFiles: 0, skippedFiles: 0 };
      }

      // Sken samo danas i juče
      const pathsToScan = this.getTodayAndYesterdayPaths();

      for (const { path, date } of pathsToScan) {
        const pathExists = await RNFS.exists(path);
        if (pathExists) {
          console.log('[ACR Watcher] Scanning:', path);
          const result = await this.scanDayDirectory(path, date);
          scannedFiles += result.scanned;
          newFiles += result.new;
          skippedFiles += result.skipped;
        } else {
          console.log('[ACR Watcher] Path does not exist (no calls that day):', path);
        }
      }

      console.log('[ACR Watcher] ✅ Scan completed');
      console.log('[ACR Watcher]   - Scanned:', scannedFiles);
      console.log('[ACR Watcher]   - New:', newFiles);
      console.log('[ACR Watcher]   - Skipped (duplicates):', skippedFiles);

      return { scannedFiles, newFiles, skippedFiles };

    } catch (error) {
      console.error('[ACR Watcher] ❌ Error scanning:', error);
      return { scannedFiles, newFiles, skippedFiles, error: error.message };
    }
  }

  async scanDayDirectory(dayPath, recordDate) {
    let scanned = 0;
    let newCount = 0;
    let skipped = 0;

    try {
      // Čitaj podfoldere (brojevi telefona)
      const phoneFolders = await RNFS.readDir(dayPath);

      for (const folder of phoneFolders) {
        if (folder.isDirectory()) {
          // Proveri da li je folder sa brojem telefona
          if (/^\+\d{10,15}$/.test(folder.name)) {
            console.log('[ACR Watcher] Scanning phone folder:', folder.name);

            // Čitaj audio fajlove u folderu
            const files = await RNFS.readDir(folder.path);

            for (const file of files) {
              if (file.isFile() && this.isAudioFile(file.name)) {
                scanned++;

                const fileUniqueId = this.getFileUniqueId(file.path);

                // Proveri da li je već obrađen
                if (this.processedFiles.has(fileUniqueId)) {
                  skipped++;
                  continue;
                }

                console.log('[ACR Watcher] 🆕 New recording found:', file.name);

                // Označi kao obrađen
                this.processedFiles.add(fileUniqueId);
                await this.saveProcessedFiles();

                // Obradi snimak
                await this.processRecording(file, folder.name, recordDate);
                newCount++;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[ACR Watcher] Error scanning day directory:', dayPath, error);
    }

    return { scanned, new: newCount, skipped };
  }

  isAudioFile(fileName) {
    const audioExtensions = ['.m4a', '.mp3', '.wav', '.3gp', '.aac', '.ogg'];
    return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  async processRecording(file, customerPhoneFolder, recordDate) {
    try {
      console.log('[ACR Watcher] ========================================');
      console.log('[ACR Watcher] Processing recording:', file.name);
      console.log('[ACR Watcher] Customer phone folder:', customerPhoneFolder);
      console.log('[ACR Watcher] Record date:', recordDate.toISOString());

      // customerPhoneFolder je već u formatu +381XXXXXXXXX
      const customerPhone = customerPhoneFolder;

      // Get file stats
      const stats = await RNFS.stat(file.path);
      console.log('[ACR Watcher] File size:', (stats.size / 1024).toFixed(2), 'KB');

      const recording = {
        id: Date.now().toString(),
        filePath: file.path,
        fileName: file.name,
        fileUniqueId: this.getFileUniqueId(file.path),
        customerPhone: customerPhone,
        technicianPhone: this.technicianPhone,
        recordedAt: recordDate.toISOString(),
        fileSize: stats.size,
        uploaded: false,
        retryCount: 0
      };

      console.log('[ACR Watcher] ----------------------------------------');
      console.log('[ACR Watcher] Recording metadata:');
      console.log('[ACR Watcher]   - ID:', recording.id);
      console.log('[ACR Watcher]   - File:', recording.fileName);
      console.log('[ACR Watcher]   - Customer Phone:', recording.customerPhone);
      console.log('[ACR Watcher]   - Technician Phone:', recording.technicianPhone);
      console.log('[ACR Watcher]   - Recorded At:', recording.recordedAt);
      console.log('[ACR Watcher] ----------------------------------------');

      // Save to offline queue
      await this.saveToOfflineQueue(recording);

      // Try to upload
      await this.uploadRecording(recording);

    } catch (error) {
      console.error('[ACR Watcher] Error processing recording:', error);
    }
  }

  async saveToOfflineQueue(recording) {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      // Proveri da li već postoji u queue-u (duplikat check)
      const exists = queue.some(r => r.fileUniqueId === recording.fileUniqueId);
      if (exists) {
        console.log('[ACR Watcher] Recording already in queue, skipping:', recording.fileUniqueId);
        return;
      }

      queue.push(recording);

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('[ACR Watcher] Saved to offline queue:', recording.id);
    } catch (error) {
      console.error('[ACR Watcher] Error saving to queue:', error);
    }
  }

  async uploadRecording(recording) {
    try {
      console.log('[ACR Watcher] 📤 Uploading recording:', recording.fileName);

      // Check if file still exists
      const exists = await RNFS.exists(recording.filePath);
      if (!exists) {
        console.error('[ACR Watcher] File no longer exists:', recording.filePath);
        await this.removeFromOfflineQueue(recording.id);
        return { success: false, reason: 'file_not_found' };
      }

      // Prepare FormData
      const formData = new FormData();

      // Determine file type
      let mimeType = 'audio/m4a';
      if (recording.filePath.endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (recording.filePath.endsWith('.wav')) {
        mimeType = 'audio/wav';
      } else if (recording.filePath.endsWith('.3gp')) {
        mimeType = 'audio/3gpp';
      }

      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${recording.filePath}` : recording.filePath,
        type: mimeType,
        name: recording.fileName
      });
      formData.append('phoneNumber', recording.technicianPhone);
      formData.append('customerPhone', recording.customerPhone);
      formData.append('recordedAt', recording.recordedAt);
      formData.append('originalFileName', recording.fileName);
      formData.append('fileUniqueId', recording.fileUniqueId);

      // Get auth token
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.error('[ACR Watcher] No auth token found');
        return { success: false, reason: 'no_token' };
      }

      console.log('[ACR Watcher] Sending to:', `${API_URL}/api/workorders/voice-recordings/upload`);

      // Upload to backend
      const response = await fetch(`${API_URL}/api/workorders/voice-recordings/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const responseText = await response.text();
      console.log('[ACR Watcher] Response status:', response.status);
      console.log('[ACR Watcher] Response body:', responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log('[ACR Watcher] ✅ Upload successful!');
        console.log('[ACR Watcher] Work order ID:', result.workOrderId);

        // Mark as uploaded and remove from queue
        recording.uploaded = true;
        await this.removeFromOfflineQueue(recording.id);

        return { success: true, workOrderId: result.workOrderId };
      } else {
        console.error('[ACR Watcher] ❌ Upload failed:', response.status);

        // If it's a 404 error (no matching work order), remove from queue
        if (response.status === 404) {
          console.log('[ACR Watcher] No matching work order found, removing from queue');
          await this.removeFromOfflineQueue(recording.id);
          return { success: false, reason: 'no_matching_workorder' };
        }

        // If duplicate on server
        if (response.status === 409) {
          console.log('[ACR Watcher] Duplicate on server, removing from queue');
          await this.removeFromOfflineQueue(recording.id);
          return { success: false, reason: 'duplicate' };
        }

        return { success: false, reason: 'upload_failed', status: response.status };
      }

    } catch (error) {
      console.error('[ACR Watcher] Upload error:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  async removeFromOfflineQueue(recordingId) {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      const updatedQueue = queue.filter(r => r.id !== recordingId);

      await AsyncStorage.setItem(queueKey, JSON.stringify(updatedQueue));
      console.log('[ACR Watcher] Removed from offline queue:', recordingId);
    } catch (error) {
      console.error('[ACR Watcher] Error removing from queue:', error);
    }
  }

  async syncOfflineQueue() {
    if (!this.isAvailable) return;

    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      console.log('[ACR Watcher] Syncing offline queue:', queue.length, 'recordings');

      for (const recording of queue) {
        if (!recording.uploaded && recording.retryCount < 5) {
          recording.retryCount = (recording.retryCount || 0) + 1;
          await this.uploadRecording(recording);

          // Update queue with new retry count
          const currentQueue = JSON.parse(await AsyncStorage.getItem(queueKey) || '[]');
          const updatedQueue = currentQueue.map(r =>
            r.id === recording.id ? recording : r
          );
          await AsyncStorage.setItem(queueKey, JSON.stringify(updatedQueue));
        }
      }
    } catch (error) {
      console.error('[ACR Watcher] Error syncing offline queue:', error);
    }
  }

  async getOfflineQueueStatus() {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      return {
        total: queue.length,
        pending: queue.filter(r => !r.uploaded).length,
        uploaded: queue.filter(r => r.uploaded).length
      };
    } catch (error) {
      console.error('[ACR Watcher] Error getting queue status:', error);
      return { total: 0, pending: 0, uploaded: 0 };
    }
  }

  // Očisti stare processed files (starije od 7 dana)
  async cleanupOldProcessedFiles() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oldSize = this.processedFiles.size;

      // Filtriraj samo fajlove iz poslednjih 7 dana
      const newProcessedFiles = new Set();
      for (const fileId of this.processedFiles) {
        // fileId format: +381.../filename.m4a
        // Ne možemo lako odrediti datum iz ovog formata, pa ćemo čuvati sve
        // Ovo je sigurno jer zauzima malo memorije
        newProcessedFiles.add(fileId);
      }

      // Za sada, ograničimo na poslednjih 1000 fajlova
      if (this.processedFiles.size > 1000) {
        const arr = Array.from(this.processedFiles);
        this.processedFiles = new Set(arr.slice(-1000));
        await this.saveProcessedFiles();
        console.log('[ACR Watcher] Cleaned up processed files:', oldSize, '->', this.processedFiles.size);
      }
    } catch (error) {
      console.error('[ACR Watcher] Error cleaning up processed files:', error);
    }
  }
}

export default new ACRPhoneRecordingWatcher();
