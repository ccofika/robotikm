import * as TaskManager from 'expo-task-manager';
import axios from 'axios';
import { API_URL } from './api';

// Koristi expo-sqlite/kv-store direktno (isti backend kao storage.js)
import AsyncStorage from 'expo-sqlite/kv-store';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TRACKING';

// MORA biti u globalnom scope-u - NE unutar React komponente
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Task error:', error.message);
    return;
  }

  if (!data) return;

  const { locations } = data;
  const location = locations?.[0];
  if (!location) return;

  try {
    // Čitaj token direktno iz storage-a (nema React context u background tasku)
    const tokenRaw = await AsyncStorage.getItem('token');
    if (!tokenRaw) {
      console.log('[BackgroundLocation] No auth token, skipping');
      return;
    }

    // storage.js čuva vrednosti kao JSON.stringify(value)
    let token;
    try {
      token = JSON.parse(tokenRaw);
    } catch {
      token = tokenRaw;
    }

    if (!token) {
      console.log('[BackgroundLocation] Empty token, skipping');
      return;
    }

    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      heading: location.coords.heading,
      deviceTimestamp: new Date(location.timestamp).toISOString(),
      requestType: 'background_tracking',
    };

    await axios.post(
      `${API_URL}/api/gps/location`,
      locationData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log('[BackgroundLocation] Location sent:', locationData.latitude.toFixed(5), locationData.longitude.toFixed(5));
  } catch (sendError) {
    console.error('[BackgroundLocation] Send failed:', sendError.message);
  }
});
