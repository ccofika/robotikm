const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo config plugin koji dodaje Android manifest entries potrebne za
 * pouzdano background location praćenje na svim uređajima.
 *
 * - Dodaje permissions: WAKE_LOCK, RECEIVE_BOOT_COMPLETED, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 * - Postavlja android:stopWithTask="false" na expo location service
 */
module.exports = function withBackgroundLocationConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // 1. Dodaj permissions
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const permissionsToAdd = [
      "android.permission.WAKE_LOCK",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
    ];

    permissionsToAdd.forEach((permission) => {
      const exists = manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === permission
      );
      if (!exists) {
        manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    // 2. Postavi stopWithTask=false na expo location service
    const application = manifest.application?.[0];
    if (application && application.service) {
      for (const service of application.service) {
        const name = service.$?.["android:name"] || "";
        if (name.includes("LocationTaskService") || name.includes("location")) {
          service.$["android:stopWithTask"] = "false";
          service.$["android:foregroundServiceType"] = "location";
          console.log(`[withBackgroundLocationConfig] Set stopWithTask=false on ${name}`);
        }
      }
    }

    return config;
  });
};
