import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import axios from 'axios';

const API_URL = 'http://192.168.1.100:5000'; // Zameni sa tvojom backend IP adresom

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // Proveri da li je u development modu
      if (__DEV__) {
        console.log('Update check skipped in development mode');
        return;
      }

      console.log('Checking for updates...');

      // Proveri da li postoji novi update na serveru
      const response = await axios.get(`${API_URL}/api/updates/check`, {
        params: {
          currentVersion: Updates.runtimeVersion || '1.0.0',
          platform: 'android'
        },
        timeout: 5000
      });

      if (response.data.updateAvailable) {
        console.log('Update available!', response.data);
        setUpdateAvailable(true);
        await downloadAndApplyUpdate();
      } else {
        console.log('App is up to date');
      }
    } catch (error) {
      console.log('Update check failed:', error.message);
      // Ne prikazuj error korisniku ako check failed - aplikacija radi normalno
      setError(null);
    }
  };

  const downloadAndApplyUpdate = async () => {
    try {
      setDownloading(true);
      console.log('Downloading update...');

      // Preuzmi update
      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        console.log('New update fetched, reloading app...');
        setProgress(100);

        // Sačekaj malo pre reload-a da korisnik vidi da je update završen
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 1000);
      } else {
        console.log('No new update available');
        setDownloading(false);
        setUpdateAvailable(false);
      }
    } catch (error) {
      console.error('Failed to fetch update:', error);
      setError('Greška pri preuzimanju update-a');
      setDownloading(false);
      setUpdateAvailable(false);
    }
  };

  if (!updateAvailable && !downloading) {
    return null;
  }

  return (
    <Modal
      visible={updateAvailable || downloading}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>

          <Text style={styles.title}>
            {downloading ? 'Ažuriranje aplikacije...' : 'Novi update dostupan'}
          </Text>

          <Text style={styles.subtitle}>
            {downloading
              ? 'Molimo sačekajte, aplikacija će se automatski restartovati.'
              : 'Preuzimanje novog update-a...'
            }
          </Text>

          {downloading && progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginTop: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 10,
  },
});
