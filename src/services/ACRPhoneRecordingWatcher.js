import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api';

class ACRPhoneRecordingWatcher {
  constructor() {
    // ACR Phone folder struktura
    this.basePath = RNFS.ExternalStorageDirectoryPath + '/Recordings/ACRPhone';
    this.processedFiles = new Set();
    this.isWatching = false;
    this.interval = null;
    this.technicianPhone = null;
  }

  async initialize(technicianPhoneNumber) {
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
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return false;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      // Check for Android 13+ (API 33+)
      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        console.error('[ACR Watcher] Storage permissions not granted');
        console.log('[ACR Watcher] Granted permissions:', granted);
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

  async startWatching() {
    if (this.isWatching) {
      console.log('[ACR Watcher] Already watching');
      return;
    }

    console.log('[ACR Watcher] Starting to watch:', this.basePath);

    // Check if folder exists
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

    // Check every 30 seconds
    this.interval = setInterval(() => {
      this.scanForNewRecordings();
    }, 30000);
  }

  stopWatching() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isWatching = false;
      console.log('[ACR Watcher] Stopped watching');
    }
  }

  async scanForNewRecordings() {
    console.log('[ACR Watcher] 🔍 Starting scan...');
    try {
      const exists = await RNFS.exists(this.basePath);
      if (!exists) {
        console.log('[ACR Watcher] Base folder does not exist yet:', this.basePath);
        return;
      }

      console.log('[ACR Watcher] ✅ Base folder exists, scanning...');

      // Sken rekurzivno kroz godine/mesece/dane/brojeve
      await this.scanDirectory(this.basePath);

      console.log('[ACR Watcher] ✅ Scan completed');

    } catch (error) {
      console.error('[ACR Watcher] ❌ Error scanning:', error);
    }
  }

  async scanDirectory(dirPath) {
    try {
      const items = await RNFS.readDir(dirPath);

      for (const item of items) {
        if (item.isDirectory()) {
          // Rekurzivno sken podfoldera
          await this.scanDirectory(item.path);
        } else if (item.isFile() && (item.name.endsWith('.m4a') || item.name.endsWith('.mp3') || item.name.endsWith('.wav') || item.name.endsWith('.3gp'))) {
          // Pronađen audio fajl
          if (!this.processedFiles.has(item.path)) {
            console.log('[ACR Watcher] New recording found:', item.path);

            // Mark as processed
            this.processedFiles.add(item.path);
            await this.saveProcessedFiles();

            // Process
            await this.processRecording(item);
          }
        }
      }
    } catch (error) {
      console.error('[ACR Watcher] Error scanning directory:', dirPath, error);
    }
  }

  async processRecording(file) {
    try {
      console.log('[ACR Watcher] Processing:', file.path);

      // Extract customer phone number from path
      // Format: /storage/.../ACRPhone/2025/11/06/+3816389927/recording.m4a
      const pathParts = file.path.split('/');

      // Pronađi broj telefona - obično je u folderu pre imena fajla
      let customerPhone = null;
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const part = pathParts[i];
        // Proveri da li izgleda kao broj telefona (sadrži cifre i možda +)
        if (/[\+\d]/.test(part) && part.length >= 9) {
          customerPhone = part;
          break;
        }
      }

      if (!customerPhone || customerPhone.length < 9) {
        console.error('[ACR Watcher] Could not extract phone number from path:', file.path);
        return;
      }

      console.log('[ACR Watcher] Extracted customer phone:', customerPhone);

      // Extract recorded date from path (pokušaj YYYY/MM/DD)
      let recordedAt = new Date(); // fallback na trenutno vreme

      // Pokušaj da izvučeš datum iz patha
      const yearMatch = pathParts.find(p => /^20\d{2}$/.test(p));
      if (yearMatch) {
        const yearIndex = pathParts.indexOf(yearMatch);
        const year = yearMatch;
        const month = pathParts[yearIndex + 1];
        const day = pathParts[yearIndex + 2];

        if (month && day && /^\d{1,2}$/.test(month) && /^\d{1,2}$/.test(day)) {
          recordedAt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          console.log('[ACR Watcher] Extracted date from path:', recordedAt);
        }
      }

      // Get file stats
      const stats = await RNFS.stat(file.path);

      const recording = {
        id: Date.now().toString(),
        filePath: file.path,
        customerPhone: customerPhone,
        technicianPhone: this.technicianPhone,
        recordedAt: recordedAt.toISOString(),
        fileSize: stats.size,
        uploaded: false,
        retryCount: 0
      };

      console.log('[ACR Watcher] Recording metadata:', recording);

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

      queue.push(recording);

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('[ACR Watcher] Saved to offline queue:', recording.id);
    } catch (error) {
      console.error('[ACR Watcher] Error saving to queue:', error);
    }
  }

  async uploadRecording(recording) {
    try {
      console.log('[ACR Watcher] Uploading recording:', recording.id);

      // Check if file still exists
      const exists = await RNFS.exists(recording.filePath);
      if (!exists) {
        console.error('[ACR Watcher] File no longer exists:', recording.filePath);
        await this.removeFromOfflineQueue(recording.id);
        return;
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
        name: `recording_${recording.id}.${recording.filePath.split('.').pop()}`
      });
      formData.append('phoneNumber', recording.technicianPhone);
      formData.append('customerPhone', recording.customerPhone);
      formData.append('recordedAt', recording.recordedAt);

      // Get auth token
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.error('[ACR Watcher] No auth token found');
        return;
      }

      console.log('[ACR Watcher] Sending upload request to:', `${API_URL}/api/workorders/voice-recordings/upload`);

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
      console.log('[ACR Watcher] Upload response status:', response.status);
      console.log('[ACR Watcher] Upload response body:', responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log('[ACR Watcher] Upload successful:', result);

        // Mark as uploaded
        recording.uploaded = true;
        await this.removeFromOfflineQueue(recording.id);

        // Optionally delete local file (commented out for safety)
        // await RNFS.unlink(recording.filePath);
        // console.log('[ACR Watcher] Local file deleted:', recording.filePath);
      } else {
        console.error('[ACR Watcher] Upload failed:', response.status, responseText);

        // If it's a 404 error (no matching work order), we can remove from queue
        if (response.status === 404) {
          console.log('[ACR Watcher] No matching work order found, removing from queue');
          await this.removeFromOfflineQueue(recording.id);
        }
      }

    } catch (error) {
      console.error('[ACR Watcher] Upload error:', error);
      // Recording stays in offline queue for retry
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
          const updatedQueue = queue.map(r =>
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
}

export default new ACRPhoneRecordingWatcher();
