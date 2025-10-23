import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from './api';

const APK_UPDATE_CHECK_INTERVAL = 3600000; // 1 hour in milliseconds
const APK_DIR = `${FileSystem.documentDirectory}apk/`;

class ApkUpdateService {
  constructor() {
    this.isChecking = false;
    this.updateCheckInterval = null;
    this.listeners = new Set();
  }

  /**
   * Get current app version from app.json
   */
  getCurrentVersion() {
    return {
      version: Constants.expoConfig?.version || '1.0.0',
      versionCode: Constants.expoConfig?.android?.versionCode || 1
    };
  }

  /**
   * Start automatic update checking
   */
  startAutoUpdateCheck() {
    // Check immediately on start
    this.checkForUpdates();

    // Then check every hour
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, APK_UPDATE_CHECK_INTERVAL);

    console.log('📱 APK auto-update checker started');
  }

  /**
   * Stop automatic update checking
   */
  stopAutoUpdateCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('📱 APK auto-update checker stopped');
    }
  }

  /**
   * Check for APK updates from backend
   */
  async checkForUpdates() {
    if (Platform.OS !== 'android') {
      return null;
    }

    if (this.isChecking) {
      return null;
    }

    try {
      this.isChecking = true;
      const { version, versionCode } = this.getCurrentVersion();

      console.log(`📱 Checking for APK updates (current: v${version}, code: ${versionCode})`);

      const response = await fetch(
        `${API_URL}/apk/check-update?currentVersion=${version}&currentVersionCode=${versionCode}`
      );

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      const data = await response.json();

      if (data.updateAvailable) {
        console.log(`🆕 New APK version available: v${data.latestVersion} (code: ${data.latestVersionCode})`);

        // Notify all listeners
        this.notifyListeners(data);

        return data;
      } else {
        console.log('✅ App is up to date');
        return null;
      }

    } catch (error) {
      console.error('❌ Error checking for APK updates:', error);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Download APK file
   */
  async downloadApk(updateInfo, onProgress) {
    try {
      console.log(`📥 Downloading APK: ${updateInfo.latestVersion}`);

      // Ensure APK directory exists
      const dirInfo = await FileSystem.getInfoAsync(APK_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(APK_DIR, { intermediates: true });
      }

      const fileName = `robotik-${updateInfo.latestVersion}.apk`;
      const fileUri = `${APK_DIR}${fileName}`;

      // Delete old APK if exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}${updateInfo.downloadUrl}`,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (onProgress) {
            onProgress(progress * 100);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        throw new Error('Download failed');
      }

      console.log('✅ APK downloaded successfully:', result.uri);
      return result.uri;

    } catch (error) {
      console.error('❌ Error downloading APK:', error);
      throw error;
    }
  }

  /**
   * Install downloaded APK
   */
  async installApk(apkUri) {
    try {
      console.log('📲 Installing APK:', apkUri);

      if (Platform.OS !== 'android') {
        throw new Error('APK installation is only supported on Android');
      }

      // Get file content URI for Android
      const contentUri = await FileSystem.getContentUriAsync(apkUri);

      // Launch APK installer
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive'
      });

      console.log('✅ APK installer launched');
      return true;

    } catch (error) {
      console.error('❌ Error installing APK:', error);
      throw error;
    }
  }

  /**
   * Download and install APK
   */
  async downloadAndInstall(updateInfo, onProgress) {
    try {
      // Download APK
      const apkUri = await this.downloadApk(updateInfo, onProgress);

      // Install APK
      await this.installApk(apkUri);

      return true;
    } catch (error) {
      console.error('❌ Error in download and install:', error);
      throw error;
    }
  }

  /**
   * Add update listener
   */
  addUpdateListener(callback) {
    this.listeners.add(callback);
    return () => this.removeUpdateListener(callback);
  }

  /**
   * Remove update listener
   */
  removeUpdateListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(updateInfo) {
    this.listeners.forEach(callback => {
      try {
        callback(updateInfo);
      } catch (error) {
        console.error('Error in update listener:', error);
      }
    });
  }

  /**
   * Clean up old APK files
   */
  async cleanupOldApks() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(APK_DIR);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(APK_DIR);

        for (const file of files) {
          if (file.endsWith('.apk')) {
            await FileSystem.deleteAsync(`${APK_DIR}${file}`);
            console.log(`🗑️ Deleted old APK: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old APKs:', error);
    }
  }
}

// Create singleton instance
const apkUpdateService = new ApkUpdateService();

export default apkUpdateService;
