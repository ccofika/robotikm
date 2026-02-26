import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';
import {
  isAggressiveOEM,
  getDeviceBrandName,
  requestBatteryOptimizationExemption,
  openManufacturerAutostart,
  openAppSettings,
} from '../utils/batteryOptimization';

const GUIDE_SHOWN_KEY = 'battery_optimization_guide_shown';

/**
 * Modal koji se prikazuje jednom posle prvog login-a na agresivnim OEM-ovima
 * (Xiaomi, Samsung, Huawei, Oppo, Vivo, OnePlus, Realme).
 * Vodi korisnika kroz korake za isključivanje battery optimization.
 */
export default function BatteryOptimizationGuide({ visible, onDismiss }) {
  const [step, setStep] = useState(0); // 0 = intro, 1 = battery exemption, 2 = autostart
  const [brandName, setBrandName] = useState('');

  useEffect(() => {
    setBrandName(getDeviceBrandName());
  }, []);

  const handleBatteryExemption = async () => {
    try {
      await requestBatteryOptimizationExemption();
    } catch (e) {
      console.log('[BatteryGuide] Battery exemption error:', e.message);
    }
    setStep(2);
  };

  const handleAutostart = async () => {
    try {
      const opened = await openManufacturerAutostart();
      if (!opened) {
        openAppSettings();
      }
    } catch (e) {
      console.log('[BatteryGuide] Autostart error:', e.message);
    }
  };

  const handleFinish = async () => {
    await storage.setItem(GUIDE_SHOWN_KEY, true);
    onDismiss();
  };

  if (Platform.OS !== 'android') return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 0 && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={64} color="#2563eb" />
              </View>
              <Text style={styles.title}>Podešavanje lokacije</Text>
              <Text style={styles.description}>
                Da bi praćenje lokacije radilo pouzdano kada aplikacija nije otvorena,
                potrebno je isključiti battery optimization za Robotik aplikaciju.
              </Text>
              <Text style={styles.description}>
                Vaš uređaj ({brandName}) može automatski ugasiti praćenje lokacije
                radi uštede baterije. Sledeća 2 koraka će to sprečiti.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => setStep(1)}>
                <Text style={styles.buttonText}>Nastavi</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {step === 1 && (
            <>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>Korak 1 od 2</Text>
              </View>
              <View style={styles.iconContainer}>
                <Ionicons name="battery-charging" size={64} color="#f59e0b" />
              </View>
              <Text style={styles.title}>Battery Optimization</Text>
              <Text style={styles.description}>
                Kliknite dugme ispod da otvorite sistemsko podešavanje.
                Izaberite "Dozvoli" ili "Ne optimizuj" za Robotik aplikaciju.
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleBatteryExemption}>
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.buttonText}>Otvori podešavanje</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={() => setStep(2)}>
                <Text style={styles.skipText}>Preskoči</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>Korak 2 od 2</Text>
              </View>
              <View style={styles.iconContainer}>
                <Ionicons name="rocket" size={64} color="#10b981" />
              </View>
              <Text style={styles.title}>Autostart podešavanje</Text>
              <Text style={styles.description}>
                Na {brandName} uređajima potrebno je omogućiti Autostart za Robotik
                aplikaciju. Kliknite dugme ispod i pronađite Robotik Mobile na listi.
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleAutostart}>
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.buttonText}>Otvori Autostart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.finishButton]}
                onPress={handleFinish}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Završi podešavanje</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Hook koji proverava da li treba prikazati guide
 */
export function useBatteryGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    checkIfNeeded();
  }, []);

  const checkIfNeeded = async () => {
    if (Platform.OS !== 'android' || !isAggressiveOEM()) {
      return;
    }
    const alreadyShown = await storage.getItem(GUIDE_SHOWN_KEY);
    if (!alreadyShown) {
      setShowGuide(true);
    }
  };

  const dismiss = () => setShowGuide(false);

  return { showGuide, dismiss };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  stepIndicator: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    width: '100%',
  },
  finishButton: {
    backgroundColor: '#10b981',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
