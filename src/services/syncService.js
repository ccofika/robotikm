import syncQueue from './syncQueue';
import networkMonitor from './networkMonitor';
import offlineStorage from './offlineStorage';
import { workOrdersAPI, userEquipmentAPI } from './api';
import api from './api';

/**
 * Sync Service
 * Implementira stvarnu logiku sinhronizacije sa serverom
 * Procesira sync queue iteme i detektuje/resolves konflikte
 */

class SyncService {
  constructor() {
    this.conflictHandlers = [];
    this.syncInProgress = false;

    // Povezi procesiranje queue-a sa ovim servisom
    this.setupQueueProcessor();
  }

  /**
   * Setup-uje processor za sync queue
   */
  setupQueueProcessor() {
    // Override processSyncItem u syncQueue
    const originalProcessSyncItem = syncQueue.processSyncItem.bind(syncQueue);
    syncQueue.processSyncItem = async (item) => {
      return await this.processSyncItem(item);
    };
  }

  // ==================== QUEUE ITEM PROCESSING ====================

  /**
   * Procesira pojedinačan sync queue item
   */
  async processSyncItem(item) {
    try {
      console.log(`[SyncService] Processing: ${item.type}`);

      switch (item.type) {
        case 'UPDATE_WORK_ORDER':
          return await this.syncUpdateWorkOrder(item);

        case 'UPDATE_USED_MATERIALS':
          return await this.syncUpdateUsedMaterials(item);

        case 'ADD_USER_EQUIPMENT':
          return await this.syncAddUserEquipment(item);

        case 'REMOVE_USER_EQUIPMENT':
          return await this.syncRemoveUserEquipment(item);

        case 'UPLOAD_IMAGE':
          return await this.syncUploadImage(item);

        case 'DELETE_IMAGE':
          return await this.syncDeleteImage(item);

        default:
          console.warn(`[SyncService] Unknown sync type: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`[SyncService] Error processing sync item:`, error);

      // Proveri da li je konflikt
      if (this.isConflictError(error)) {
        await this.handleConflict(item, error);
        return false; // Ne pokušavaj ponovo automatski
      }

      throw error;
    }
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Sinhronizuje ažuriranje radnog naloga
   */
  async syncUpdateWorkOrder(item) {
    const { workOrderId, technicianId, updates } = item.data;

    try {
      // Pre slanja, proveri za konflikte
      const conflict = await this.detectWorkOrderConflict(workOrderId, updates);

      if (conflict) {
        await this.handleConflict(item, conflict);
        return false;
      }

      // Pošalji na server
      await workOrdersAPI.updateByTechnician(workOrderId, updates);

      // Ažuriraj lokalni storage sa serverskim podacima
      await offlineStorage.updateWorkOrder(technicianId, workOrderId, {
        ...updates,
        _synced: true,
        _syncedAt: Date.now()
      });

      console.log(`[SyncService] Successfully synced work order update: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing work order update:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje ažuriranje korišćenih materijala
   */
  async syncUpdateUsedMaterials(item) {
    const { workOrderId, technicianId, materials } = item.data;

    try {
      await workOrdersAPI.updateUsedMaterials(workOrderId, {
        materials,
        technicianId
      });

      await offlineStorage.updateWorkOrder(technicianId, workOrderId, {
        materials,
        _synced: true
      });

      console.log(`[SyncService] Successfully synced used materials for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing used materials:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje dodavanje opreme korisniku
   */
  async syncAddUserEquipment(item) {
    const { userId, equipmentId, workOrderId, technicianId } = item.data;

    try {
      await userEquipmentAPI.add({
        userId,
        equipmentId,
        workOrderId,
        technicianId
      });

      console.log(`[SyncService] Successfully synced add user equipment for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing add user equipment:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje uklanjanje opreme korisnika
   */
  async syncRemoveUserEquipment(item) {
    const { workOrderId, equipmentId, removalReason, isWorking, technicianId } = item.data;

    try {
      await userEquipmentAPI.remove(equipmentId, {
        workOrderId,
        technicianId,
        removalReason,
        isWorking: isWorking !== undefined ? isWorking : true
      });

      console.log(`[SyncService] Successfully synced remove user equipment: ${equipmentId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing remove user equipment:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje upload slike
   */
  async syncUploadImage(item) {
    const { workOrderId, imageUri, technicianId } = item.data;

    try {
      // Kreiraj FormData za upload
      const formData = new FormData();

      // Determine file type
      let fileType = 'image/jpeg';
      if (imageUri.endsWith('.png')) fileType = 'image/png';
      else if (imageUri.endsWith('.jpg') || imageUri.endsWith('.jpeg')) fileType = 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: `photo_${Date.now()}.jpg`,
        type: fileType
      });

      formData.append('technicianId', technicianId);

      // Upload
      await api.post(
        `/api/workorders/${workOrderId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );

      console.log(`[SyncService] Successfully synced image upload for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing image upload:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje brisanje slike
   */
  async syncDeleteImage(item) {
    const { workOrderId, imageUrl } = item.data;

    try {
      await api.delete(`/api/workorders/${workOrderId}/images`, {
        data: { imageUrl }
      });

      console.log(`[SyncService] Successfully synced image deletion for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing image deletion:', error);
      throw error;
    }
  }

  // ==================== CONFLICT DETECTION ====================

  /**
   * Detektuje konflikt pri ažuriranju radnog naloga
   */
  async detectWorkOrderConflict(workOrderId, localUpdates) {
    try {
      // Fetchuj trenutnu verziju sa servera
      const response = await workOrdersAPI.getOne(workOrderId);
      const serverVersion = response.data;

      // Proveri timestamp ako postoji
      if (serverVersion.lastModified && localUpdates.lastModified) {
        if (serverVersion.lastModified > localUpdates.lastModified) {
          // Server verzija je novija - potencijalni konflikt
          return {
            type: 'timestamp_conflict',
            serverVersion,
            localUpdates,
            conflictingFields: this.findConflictingFields(serverVersion, localUpdates)
          };
        }
      }

      // Proveri kritične statusne promene
      if (serverVersion.status === 'zavrsen' && localUpdates.status && localUpdates.status !== 'zavrsen') {
        return {
          type: 'status_conflict',
          message: 'Radni nalog je već završen na serveru',
          serverVersion,
          localUpdates
        };
      }

      return null;
    } catch (error) {
      console.error('[SyncService] Error detecting conflict:', error);
      return null;
    }
  }

  /**
   * Pronalazi konfliktna polja između dve verzije
   */
  findConflictingFields(serverVersion, localUpdates) {
    const conflicts = [];
    const fieldsToCheck = ['status', 'comment', 'materials', 'completedAt', 'postponeComment', 'cancelComment'];

    for (const field of fieldsToCheck) {
      if (localUpdates[field] !== undefined && serverVersion[field] !== undefined) {
        // Uporedi vrednosti
        const serverValue = JSON.stringify(serverVersion[field]);
        const localValue = JSON.stringify(localUpdates[field]);

        if (serverValue !== localValue) {
          conflicts.push({
            field,
            serverValue: serverVersion[field],
            localValue: localUpdates[field]
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Proverava da li je greška uzrokovana konfliktom
   */
  isConflictError(error) {
    if (!error.response) return false;

    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message || '';

    // 409 Conflict ili specifične poruke
    if (status === 409) return true;
    if (message.includes('already completed') || message.includes('već završen')) return true;
    if (message.includes('conflict') || message.includes('konflikt')) return true;

    return false;
  }

  // ==================== CONFLICT RESOLUTION ====================

  /**
   * Obrađuje konflikt
   */
  async handleConflict(syncItem, conflict) {
    console.log(`[SyncService] Conflict detected for item ${syncItem.id}:`, conflict);

    // Notifikuj sve conflict handlers
    for (const handler of this.conflictHandlers) {
      try {
        await handler(syncItem, conflict);
      } catch (error) {
        console.error('[SyncService] Error in conflict handler:', error);
      }
    }

    // Označi item kao failed sa conflict informacijom
    await syncQueue.updateQueueItem(syncItem.id, {
      status: 'failed',
      error: conflict.message || 'Conflict detected',
      conflictData: conflict
    });
  }

  /**
   * Dodaje handler za konflikte
   */
  addConflictHandler(handler) {
    this.conflictHandlers.push(handler);

    return () => {
      this.conflictHandlers = this.conflictHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Resolves konflikt sa odabranom strategijom
   */
  async resolveConflict(syncItemId, strategy, resolution) {
    try {
      const queue = await syncQueue.getQueue();
      const item = queue.find(i => i.id === syncItemId);

      if (!item) {
        throw new Error('Sync item not found');
      }

      switch (strategy) {
        case 'use_local':
          // Forsira upload lokalne verzije
          await syncQueue.updateQueueItem(syncItemId, {
            status: 'pending',
            retryCount: 0,
            error: null,
            conflictData: null,
            forceUpdate: true
          });
          break;

        case 'use_server':
          // Odbaci lokalnu verziju, prihvati serversku
          await syncQueue.removeFromQueue(syncItemId);
          // Refresh data sa servera će prepisati lokalne izmene
          break;

        case 'merge':
          // Spoji izmene
          if (resolution.mergedData) {
            await syncQueue.updateQueueItem(syncItemId, {
              status: 'pending',
              retryCount: 0,
              error: null,
              conflictData: null,
              data: resolution.mergedData
            });
          }
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      // Pokreni sync ponovo
      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      console.log(`[SyncService] Conflict resolved with strategy: ${strategy}`);
    } catch (error) {
      console.error('[SyncService] Error resolving conflict:', error);
      throw error;
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Pokreće punu sinhronizaciju
   */
  async syncAll() {
    if (this.syncInProgress) {
      console.log('[SyncService] Sync already in progress');
      return;
    }

    if (!networkMonitor.getIsOnline()) {
      console.log('[SyncService] Device is offline');
      return;
    }

    this.syncInProgress = true;

    try {
      console.log('[SyncService] Starting full sync...');

      // Procesira queue
      await syncQueue.processQueue();

      console.log('[SyncService] Full sync completed');
    } catch (error) {
      console.error('[SyncService] Error during full sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Vraća status sinhronizacije
   */
  async getSyncStatus() {
    const queueStats = await syncQueue.getQueueStats();

    return {
      isOnline: networkMonitor.getIsOnline(),
      isSyncing: this.syncInProgress || queueStats.syncing > 0,
      pendingCount: queueStats.pending,
      failedCount: queueStats.failed,
      hasConflicts: queueStats.items.some(item => item.conflictData),
      queueStats
    };
  }
}

// Singleton instanca
const syncService = new SyncService();

export default syncService;
