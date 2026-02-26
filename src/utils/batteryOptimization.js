import * as IntentLauncher from 'expo-intent-launcher';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';

/**
 * Manufacturer-specifični intent-ovi za autostart podešavanja.
 * Ovi intent-ovi otvaraju direktno stranicu za autostart na svakom OEM-u.
 */
const MANUFACTURER_AUTOSTART_INTENTS = {
  xiaomi: [
    { packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' },
    { packageName: 'com.miui.securitycenter', className: 'com.miui.powercenter.PowerSettings' },
  ],
  redmi: [
    { packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' },
  ],
  poco: [
    { packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' },
  ],
  samsung: [
    { packageName: 'com.samsung.android.lool', className: 'com.samsung.android.sm.ui.battery.BatteryActivity' },
    { packageName: 'com.samsung.android.lool', className: 'com.samsung.android.sm.battery.ui.BatteryActivity' },
  ],
  huawei: [
    { packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' },
    { packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.optimize.process.ProtectActivity' },
  ],
  honor: [
    { packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' },
  ],
  oppo: [
    { packageName: 'com.coloros.safecenter', className: 'com.coloros.safecenter.permission.startup.StartupAppListActivity' },
    { packageName: 'com.oppo.safe', className: 'com.oppo.safe.permission.startup.StartupAppListActivity' },
  ],
  realme: [
    { packageName: 'com.coloros.safecenter', className: 'com.coloros.safecenter.permission.startup.StartupAppListActivity' },
  ],
  vivo: [
    { packageName: 'com.vivo.permissionmanager', className: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity' },
    { packageName: 'com.iqoo.secure', className: 'com.iqoo.secure.ui.phoneoptimize.BgStartUpManager' },
  ],
  oneplus: [
    { packageName: 'com.oneplus.security', className: 'com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity' },
  ],
};

/**
 * Otvori dijalog za isključivanje battery optimization za našu app.
 * Ovo prikazuje sistemski dijalog "Dozvoli app da radi u pozadini?"
 */
export async function requestBatteryOptimizationExemption() {
  if (Platform.OS !== 'android') return false;

  try {
    const packageName = Constants.expoConfig?.android?.package || 'com.robotik.mobile';
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${packageName}` }
    );
    return true;
  } catch (e) {
    console.log('[BatteryOptimization] Direct exemption failed, trying settings page:', e.message);
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
      );
      return true;
    } catch (e2) {
      console.log('[BatteryOptimization] Settings page failed:', e2.message);
      return false;
    }
  }
}

/**
 * Otvori manufacturer-specifičnu autostart stranicu.
 * Vraća true ako je uspešno otvorena, false ako nije pronađena.
 */
export async function openManufacturerAutostart() {
  if (Platform.OS !== 'android') return false;

  const brand = (Device.brand || '').toLowerCase();
  const manufacturer = (Device.manufacturer || '').toLowerCase();

  // Pronađi odgovarajuće intent-ove za ovaj brend
  let intents = null;
  for (const [key, value] of Object.entries(MANUFACTURER_AUTOSTART_INTENTS)) {
    if (brand.includes(key) || manufacturer.includes(key)) {
      intents = value;
      break;
    }
  }

  if (!intents) return false;

  // Pokušaj svaki intent dok jedan ne uspe
  for (const intent of intents) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        packageName: intent.packageName,
        className: intent.className,
      });
      console.log(`[BatteryOptimization] Opened autostart settings via ${intent.className}`);
      return true;
    } catch (e) {
      console.log(`[BatteryOptimization] Intent failed for ${intent.className}:`, e.message);
    }
  }

  return false;
}

/**
 * Otvori app-specifična podešavanja (fallback).
 */
export function openAppSettings() {
  Linking.openSettings();
}

/**
 * Proveri da li je uređaj od brenda koji agresivno ubija background procese.
 */
export function isAggressiveOEM() {
  if (Platform.OS !== 'android') return false;

  const brand = (Device.brand || '').toLowerCase();
  const manufacturer = (Device.manufacturer || '').toLowerCase();

  const aggressiveBrands = ['xiaomi', 'redmi', 'poco', 'huawei', 'honor', 'oppo', 'vivo', 'oneplus', 'realme', 'samsung'];
  return aggressiveBrands.some(b => brand.includes(b) || manufacturer.includes(b));
}

/**
 * Vrati ime brenda za prikaz korisniku.
 */
export function getDeviceBrandName() {
  return Device.brand || Device.manufacturer || 'Android';
}
