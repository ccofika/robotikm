import { storage } from '../utils/storage';
import networkMonitor from './networkMonitor';

// React Native kompatibilna UUID funkcija
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Sync Queue Manager
 * Upravlja redom čekanja akcija za sinhronizaciju sa serverom
 *
 * Queue Item struktura:
 * {
 *   id: string (uuid),
 *   type: string (tip akcije),
 *   entity: string (tip entiteta),
 *   entityId: string (ID entiteta),
 *   action: 'create' | 'update' | 'delete',
 *   data: object (podaci za sinhronizaciju),
 *   timestamp: number,
 *   retryCount: number,
 *   maxRetries: number,
 *   status: 'pending' | 'syncing' | 'failed' | 'synced',
 *   error: string | null,
 *   lastAttempt: number | null
 * }
 */

class SyncQueueManager {
  constructor() {
    this.STORAGE_KEY = 'syncQueue';
    this.MAX_RETRIES = 5;
    this.RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 60000]; // Exponential backoff + max 1min
    this.STALE_SYNC_TIMEOUT = 5 * 60 * 1000; // 5 minuta - ako je sync duži od ovoga, resetuj
    this.isProcessing = false;
    this.processingStartedAt = null;
    this.listeners = [];
  }

  // ==================== QUEUE OPERATIONS ====================

  /**
   * Dodaje novu akciju u red čekanja
   * @param {object} queueItem - Item za dodavanje u queue
   * @param {boolean} autoProcess - Da li automatski pozvati processQueue (default: true)
   */
  async addToQueue(queueItem, autoProcess = true) {
    try {
      const queue = await this.getQueue();

      const newItem = {
        id: generateUUID(),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: queueItem.maxRetries || this.MAX_RETRIES,
        status: 'pending',
        error: null,
        lastAttempt: null,
        ...queueItem
      };

      queue.push(newItem);
      await this.saveQueue(queue);

      console.log(`[SyncQueue] Added item to queue: ${newItem.type} (${newItem.id})`);
      this.notifyListeners();

      // Pokušaj odmah da procesira ako je online i autoProcess = true
      if (autoProcess && networkMonitor.getIsOnline()) {
        console.log(`[SyncQueue] Auto-processing queue (autoProcess=${autoProcess})`);
        this.processQueue();
      } else if (!autoProcess) {
        console.log(`[SyncQueue] Skipping auto-process (autoProcess=${autoProcess})`);
      }

      return newItem.id;
    } catch (error) {
      console.error('[SyncQueue] Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Učitava red čekanja iz storage-a
   */
  async getQueue() {
    try {
      const queue = await storage.getItem(this.STORAGE_KEY);
      return Array.isArray(queue) ? queue : [];
    } catch (error) {
      console.error('[SyncQueue] Error loading queue:', error);
      return [];
    }
  }

  /**
   * Čuva red čekanja u storage
   */
  async saveQueue(queue) {
    try {
      await storage.setItem(this.STORAGE_KEY, queue);
    } catch (error) {
      console.error('[SyncQueue] Error saving queue:', error);
      throw error;
    }
  }

  /**
   * Uklanja item iz reda
   */
  async removeFromQueue(itemId) {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await this.saveQueue(filteredQueue);
      console.log(`[SyncQueue] Removed item from queue: ${itemId}`);
      this.notifyListeners();
    } catch (error) {
      console.error('[SyncQueue] Error removing from queue:', error);
      throw error;
    }
  }

  /**
   * Ažurira status item-a u redu
   */
  async updateQueueItem(itemId, updates) {
    try {
      const queue = await this.getQueue();
      const index = queue.findIndex(item => item.id === itemId);

      if (index !== -1) {
        queue[index] = {
          ...queue[index],
          ...updates,
          lastAttempt: Date.now()
        };
        await this.saveQueue(queue);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[SyncQueue] Error updating queue item:', error);
      throw error;
    }
  }

  // ==================== QUEUE PROCESSING ====================

  /**
   * Resetuje zaglavljene "syncing" iteme koji su stariji od STALE_SYNC_TIMEOUT.
   * Ovo sprečava permanentno zaglavljeni "sinhronizacija u toku" banner.
   */
  async resetStaleSyncingItems() {
    try {
      const queue = await this.getQueue();
      const now = Date.now();
      let changed = false;

      const updatedQueue = queue.map(item => {
        if (item.status === 'syncing' && item.lastAttempt) {
          const timeSinceAttempt = now - item.lastAttempt;
          if (timeSinceAttempt > this.STALE_SYNC_TIMEOUT) {
            console.log(`[SyncQueue] Resetting stale syncing item: ${item.id} (${item.type}), stuck for ${Math.round(timeSinceAttempt / 1000)}s`);
            changed = true;
            return {
              ...item,
              status: item.retryCount >= item.maxRetries ? 'failed' : 'pending',
              error: 'Sync timeout - automatski resetovano'
            };
          }
        }
        return item;
      });

      if (changed) {
        await this.saveQueue(updatedQueue);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[SyncQueue] Error resetting stale syncing items:', error);
    }
  }

  /**
   * Procesira red čekanja
   */
  async processQueue() {
    // Proveri da li je online
    if (!networkMonitor.getIsOnline()) {
      console.log('[SyncQueue] Offline - queue processing skipped');
      return;
    }

    // Proveri da li već procesira
    if (this.isProcessing) {
      // Stale lock detection - ako procesiramo duže od 5 minuta, resetuj
      if (this.processingStartedAt && (Date.now() - this.processingStartedAt > this.STALE_SYNC_TIMEOUT)) {
        console.warn('[SyncQueue] Processing lock stale, resetting...');
        this.isProcessing = false;
      } else {
        console.log('[SyncQueue] Queue already processing');
        return;
      }
    }

    this.isProcessing = true;
    this.processingStartedAt = Date.now();

    try {
      // Prvo resetuj zaglavljene syncing iteme
      await this.resetStaleSyncingItems();

      const queue = await this.getQueue();
      const pendingItems = queue.filter(item =>
        item.status === 'pending' ||
        (item.status === 'failed' && item.retryCount < item.maxRetries)
      );

      if (pendingItems.length === 0) {
        console.log('[SyncQueue] No pending items to process');
        this.isProcessing = false;
        this.processingStartedAt = null;
        this.notifyListeners();
        return;
      }

      console.log(`[SyncQueue] Processing ${pendingItems.length} items`);

      // Procesira sve pending iteme redom
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];

        // Proveri da li smo i dalje online tokom procesiranja
        if (!networkMonitor.getIsOnline()) {
          console.log('[SyncQueue] Went offline during processing, stopping');
          break;
        }

        console.log(`[SyncQueue] Processing item ${i + 1}/${pendingItems.length}: ${item.type}`);

        try {
          // Proveri da li treba da čeka pre retry-a
          if (item.retryCount > 0) {
            const delay = this.getRetryDelay(item.retryCount);
            const timeSinceLastAttempt = Date.now() - (item.lastAttempt || 0);

            if (timeSinceLastAttempt < delay) {
              console.log(`[SyncQueue] Waiting for retry delay: ${item.id}`);
              continue;
            }
          }

          // Ažuriraj status na 'syncing'
          await this.updateQueueItem(item.id, { status: 'syncing' });

          // Procesira item pozivanjem syncService
          const success = await this.processSyncItem(item);

          if (success) {
            // Ukloni iz queue-a
            await this.removeFromQueue(item.id);
            console.log(`[SyncQueue] Successfully synced and removed: ${item.type} (${item.id})`);
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          console.error(`[SyncQueue] Error processing item ${item.id}:`, error);

          // Ažuriraj item sa greškom i povećaj retry count
          const newRetryCount = item.retryCount + 1;
          const updates = {
            status: newRetryCount >= item.maxRetries ? 'failed' : 'pending',
            retryCount: newRetryCount,
            error: error.message
          };

          await this.updateQueueItem(item.id, updates);
          console.log(`[SyncQueue] Item ${item.id} marked as ${updates.status}, retryCount: ${newRetryCount}`);
        }
      }

      console.log(`[SyncQueue] Finished processing ${pendingItems.length} items`);
    } catch (error) {
      console.error('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      this.processingStartedAt = null;
      this.notifyListeners();
    }
  }

  /**
   * Procesira pojedinačan sync item pozivajući syncService
   * NAPOMENA: Ova metoda će biti override-ovana od strane syncService.setupQueueProcessor()
   */
  async processSyncItem(item) {
    console.log(`[SyncQueue] Processing sync item: ${item.type}`);

    // Placeholder - syncService će override-ovati ovu metodu
    // Privremeno vraćamo true dok se syncService ne učita
    return true;
  }

  /**
   * Vraća delay za retry u milisekundama
   */
  getRetryDelay(retryCount) {
    return this.RETRY_DELAYS[Math.min(retryCount - 1, this.RETRY_DELAYS.length - 1)];
  }

  // ==================== QUEUE QUERIES ====================

  /**
   * Vraća statistiku o redu
   */
  async getQueueStats() {
    try {
      const queue = await this.getQueue();

      return {
        total: queue.length,
        pending: queue.filter(item => item.status === 'pending').length,
        syncing: queue.filter(item => item.status === 'syncing').length,
        failed: queue.filter(item => item.status === 'failed').length,
        items: queue
      };
    } catch (error) {
      console.error('[SyncQueue] Error getting queue stats:', error);
      return {
        total: 0,
        pending: 0,
        syncing: 0,
        failed: 0,
        items: []
      };
    }
  }

  /**
   * Vraća sve neuspešne iteme
   */
  async getFailedItems() {
    try {
      const queue = await this.getQueue();
      return queue.filter(item => item.status === 'failed');
    } catch (error) {
      console.error('[SyncQueue] Error getting failed items:', error);
      return [];
    }
  }

  /**
   * Resetuje retry count za failed item (za manual retry)
   */
  async retryFailedItem(itemId) {
    try {
      await this.updateQueueItem(itemId, {
        status: 'pending',
        retryCount: 0,
        error: null
      });

      console.log(`[SyncQueue] Retry scheduled for item: ${itemId}`);

      // Pokušaj da procesira red
      if (networkMonitor.getIsOnline()) {
        this.processQueue();
      }
    } catch (error) {
      console.error('[SyncQueue] Error retrying failed item:', error);
      throw error;
    }
  }

  /**
   * Resetuje sve neuspešne iteme
   */
  async retryAllFailed() {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.map(item => {
        if (item.status === 'failed') {
          return {
            ...item,
            status: 'pending',
            retryCount: 0,
            error: null
          };
        }
        return item;
      });

      await this.saveQueue(updatedQueue);
      console.log('[SyncQueue] All failed items reset for retry');
      this.notifyListeners();

      // Pokušaj da procesira red
      if (networkMonitor.getIsOnline()) {
        this.processQueue();
      }
    } catch (error) {
      console.error('[SyncQueue] Error retrying all failed:', error);
      throw error;
    }
  }

  /**
   * Briše item iz queue-a (za manual dismiss)
   */
  async dismissFailedItem(itemId) {
    try {
      await this.removeFromQueue(itemId);
      console.log(`[SyncQueue] Dismissed failed item: ${itemId}`);
    } catch (error) {
      console.error('[SyncQueue] Error dismissing failed item:', error);
      throw error;
    }
  }

  /**
   * Briše sve iteme iz queue-a
   */
  async clearQueue() {
    try {
      await this.saveQueue([]);
      console.log('[SyncQueue] Queue cleared');
      this.notifyListeners();
    } catch (error) {
      console.error('[SyncQueue] Error clearing queue:', error);
      throw error;
    }
  }

  // ==================== LISTENERS ====================

  /**
   * Dodaje listener za promene u queue-u
   */
  addListener(callback) {
    this.listeners.push(callback);

    // Odmah pozovi callback sa trenutnim stanjem
    this.getQueueStats().then(stats => callback(stats));

    // Vrati unsubscribe funkciju
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notifikuje sve listenere o promeni
   */
  notifyListeners() {
    this.getQueueStats().then(stats => {
      this.listeners.forEach(listener => {
        try {
          listener(stats);
        } catch (error) {
          console.error('[SyncQueue] Error notifying listener:', error);
        }
      });
    });
  }
}

// Singleton instanca
const syncQueue = new SyncQueueManager();

export default syncQueue;
