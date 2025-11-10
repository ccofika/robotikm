/**
 * Background Task Handler for Notifications
 *
 * Ovaj fajl se mora importovati u App.js DA BI background task bio registrovan
 * pre nego što se app inicijalizuje. Background task omogućava procesiranje
 * notifikacija kada je aplikacija potpuno zatvorena ili u background-u.
 */

import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

/**
 * Background task za procesiranje notifikacija
 *
 * VAŽNO: Ovaj task se poziva samo kada:
 * 1. Notifikacija je "data-only" (samo data field, bez title/body)
 * 2. App je u background-u ili terminated
 *
 * Za regularnu notifikaciju sa title i body (što mi koristimo),
 * Android OS automatski prikazuje notifikaciju i NE poziva ovaj task.
 *
 * Ovaj task je koristan za:
 * - Sinhronizaciju podataka kada notifikacija stigne
 * - Ažuriranje lokalne baze podataka
 * - Refresh-ovanje podataka u background-u
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  const timestamp = new Date().toISOString();

  if (error) {
    console.error(`[${timestamp}] ❌ Background notification task error:`, error);
    return;
  }

  console.log(`[${timestamp}] 📬 Background notification task triggered`);

  if (data) {
    const { notification } = data;
    console.log(`[${timestamp}] 📱 Notification data:`, JSON.stringify(notification, null, 2));

    // Ovde možete dodati dodatnu logiku za procesiranje notifikacije
    // npr. sinhronizaciju sa lokalnom bazom, ažuriranje badge-a, itd.

    // Primer: Proveri tip notifikacije i uradi nešto specifično
    const notificationData = notification?.request?.content?.data;
    if (notificationData) {
      const { type, relatedId } = notificationData;

      console.log(`[${timestamp}] 🏷️ Notification type: ${type}, relatedId: ${relatedId}`);

      switch (type) {
        case 'work_order':
          console.log(`[${timestamp}] 📋 Work order notification in background: ${relatedId}`);
          // Ovde možete sinhronizovati radne naloge sa serverom
          // Npr: fetchWorkOrdersInBackground()
          break;
        case 'equipment_add':
          console.log(`[${timestamp}] 🔧 Equipment added notification in background: ${relatedId}`);
          // Npr: fetchEquipmentInBackground()
          break;
        case 'equipment_remove':
          console.log(`[${timestamp}] 🗑️ Equipment removed notification in background: ${relatedId}`);
          break;
        default:
          console.log(`[${timestamp}] 📨 General notification in background`);
      }
    }
  } else {
    console.warn(`[${timestamp}] ⚠️ Background notification task called but no data received`);
  }
});

/**
 * Registruj background notification task
 * OVO SE MORA POZVATI PRE NEGO ŠTO SE APP INICIJALIZUJE
 */
export const registerBackgroundNotificationTask = async () => {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('✅ Background notification task registrovan uspešno');
  } catch (error) {
    console.error('❌ Greška pri registraciji background notification task:', error);
  }
};

// Automatski registruj task kada se ovaj modul importuje
registerBackgroundNotificationTask();

export default BACKGROUND_NOTIFICATION_TASK;
