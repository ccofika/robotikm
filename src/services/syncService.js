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
    this.syncCompletionListeners = []; // Listeners za sync completion events

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

      let success = false;

      switch (item.type) {
        case 'UPDATE_WORK_ORDER':
          success = await this.syncUpdateWorkOrder(item);
          break;

        case 'UPDATE_USED_MATERIALS':
          success = await this.syncUpdateUsedMaterials(item);
          break;

        case 'ADD_USER_EQUIPMENT':
          success = await this.syncAddUserEquipment(item);
          break;

        case 'REMOVE_USER_EQUIPMENT':
          success = await this.syncRemoveUserEquipment(item);
          break;

        case 'REMOVE_EQUIPMENT_BY_SERIAL':
          success = await this.syncRemoveEquipmentBySerial(item);
          break;

        case 'UPLOAD_IMAGE':
          success = await this.syncUploadImage(item);
          break;

        case 'DELETE_IMAGE':
          success = await this.syncDeleteImage(item);
          break;

        default:
          console.warn(`[SyncService] Unknown sync type: ${item.type}`);
          return false;
      }

      // Obavesti listenere o uspešnoj sinhronizaciji
      if (success) {
        this.notifySyncCompletion(item);
      }

      return success;
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

    console.log('[SyncService] Syncing add user equipment:', {
      userId,
      equipmentId,
      workOrderId,
      technicianId
    });

    try {
      // Dodaj opremu na server
      const response = await userEquipmentAPI.add({
        userId,
        equipmentId,
        workOrderId,
        technicianId
      });

      console.log('[SyncService] Server response for add equipment:', response.data);

      // VAŽNO: Nakon uspešnog dodavanja, refresh user equipment sa servera
      // da bi dobili pravu opremu sa pravilnim ID-jem
      try {
        const userEquipmentResponse = await workOrdersAPI.getUserEquipment(workOrderId);
        const serverUserEquipment = userEquipmentResponse.data;

        console.log('[SyncService] Refreshing local user equipment with server data:', serverUserEquipment);

        // Sačuvaj server verziju lokalno (zameni temporary verziju)
        await offlineStorage.saveUserEquipment(workOrderId, serverUserEquipment);
      } catch (refreshError) {
        console.error('[SyncService] Error refreshing user equipment after add:', refreshError);
        // Ne fail-uj sync ako refresh ne uspe
      }

      console.log(`[SyncService] Successfully synced add user equipment for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing add user equipment:', error);

      // Ako je greška "oprema već dodeljena", tretiramo kao uspeh
      const errorMessage = error.response?.data?.error || '';
      if (errorMessage.includes('već dodeljena') || errorMessage.includes('already assigned')) {
        console.log('[SyncService] Equipment already assigned - marking as success');
        return true;
      }

      throw error;
    }
  }

  /**
   * Sinhronizuje uklanjanje opreme korisnika
   */
  async syncRemoveUserEquipment(item) {
    const { workOrderId, equipmentId, removalReason, isWorking, technicianId } = item.data;

    console.log('[SyncService] Attempting to sync remove user equipment:', {
      itemId: item.id,
      retryCount: item.retryCount,
      workOrderId,
      equipmentId,
      removalReason,
      isWorking,
      technicianId,
      fullItem: item
    });

    try {
      // Proveri da li je 404 greška zbog toga što oprema ne postoji više
      // U tom slučaju, samo označi kao uspešno jer je cilj postignut
      try {
        await userEquipmentAPI.remove(equipmentId, {
          workOrderId,
          technicianId,
          removalReason,
          isWorking: isWorking !== undefined ? isWorking : true
        });
      } catch (error) {
        // Loguj detalje greške
        console.error('[SyncService] API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });

        // Ako je 404, znači da oprema već ne postoji - to je OK
        if (error.response?.status === 404) {
          console.log(`[SyncService] Equipment ${equipmentId} already removed (404) - marking as success`);
          return true;
        }

        // Ako je 500 i poruka kaže da oprema nije pronađena, tretiramo kao uspeh
        const errorMessage = error.response?.data?.error || error.response?.data?.message || '';

        // Generička 500 greška bez detalja - verovatno stara akcija koja više nije relevantna
        if (error.response?.status === 500) {
          // Proveri retry count - ako je bilo mnogo pokušaja, preskoči
          if (item.retryCount >= 3) {
            console.log(`[SyncService] Equipment removal failed after ${item.retryCount} retries - marking as success to prevent infinite loop`);
            return true;
          }

          // Ako poruka sadrži "nije pronađena" ili generička greška
          if (errorMessage.includes('nije pronađena') || errorMessage === 'Greška pri uklanjanju opreme') {
            console.log(`[SyncService] Generic equipment removal error (500) - likely outdated action, marking as success`);
            return true;
          }
        }

        throw error;
      }

      console.log(`[SyncService] Successfully synced remove user equipment: ${equipmentId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing remove user equipment:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje uklanjanje opreme po serijskom broju (removed equipment)
   */
  async syncRemoveEquipmentBySerial(item) {
    const { workOrderId, technicianId, equipmentName, serialNumber, condition } = item.data;

    console.log('[SyncService] Syncing remove equipment by serial:', {
      workOrderId,
      technicianId,
      equipmentName,
      serialNumber,
      condition
    });

    try {
      await userEquipmentAPI.removeBySerial({
        workOrderId,
        technicianId,
        equipmentName,
        serialNumber,
        condition
      });

      // Refresh removed equipment sa servera nakon uspešnog sync-a
      try {
        const removedEquipmentResponse = await userEquipmentAPI.getRemovedForWorkOrder(workOrderId);
        const serverRemovedEquipment = removedEquipmentResponse.data;

        console.log('[SyncService] Refreshing local removed equipment with server data:', serverRemovedEquipment);

        // Sačuvaj server verziju lokalno (zameni temporary verziju)
        await offlineStorage.saveRemovedEquipment(workOrderId, serverRemovedEquipment);
      } catch (refreshError) {
        console.error('[SyncService] Error refreshing removed equipment after sync:', refreshError);
        // Ne fail-uj sync ako refresh ne uspe
      }

      console.log(`[SyncService] Successfully synced remove equipment by serial for: ${workOrderId}`);
      return true;
    } catch (error) {
      console.error('[SyncService] Error syncing remove equipment by serial:', error);

      // Ako je greška "oprema već uklonjena", tretiramo kao uspeh
      const errorMessage = error.response?.data?.error || '';
      if (errorMessage.includes('već uklonjena') || errorMessage.includes('already removed')) {
        console.log('[SyncService] Equipment already removed - marking as success');
        return true;
      }

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

      // VAŽNO: Nakon uspešnog upload-a, refresh work order sa servera
      // da bi dobili ažuriranu listu slika
      try {
        const workOrderResponse = await workOrdersAPI.getOne(workOrderId);
        const serverWorkOrder = workOrderResponse.data;

        console.log('[SyncService] Refreshing local work order with updated images:', serverWorkOrder.images);

        // Ažuriraj work order u offline storage sa novim slikama
        await offlineStorage.updateWorkOrder(technicianId, workOrderId, {
          images: serverWorkOrder.images,
          _synced: true
        });
      } catch (refreshError) {
        console.error('[SyncService] Error refreshing work order after image upload:', refreshError);
        // Ne fail-uj sync ako refresh ne uspe
      }

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

  // ==================== EVENT LISTENERS ====================

  /**
   * Dodaje listener za sync completion događaje
   */
  addSyncCompletionListener(listener) {
    this.syncCompletionListeners.push(listener);
    console.log('[SyncService] Added sync completion listener');

    // Vraća unsubscribe funkciju
    return () => {
      this.syncCompletionListeners = this.syncCompletionListeners.filter(l => l !== listener);
      console.log('[SyncService] Removed sync completion listener');
    };
  }

  /**
   * Notifikuje sve listenere o sync completion događaju
   */
  notifySyncCompletion(syncItem) {
    console.log('[SyncService] Notifying sync completion listeners:', {
      type: syncItem.type,
      entityId: syncItem.data?.workOrderId,
      listenerCount: this.syncCompletionListeners.length
    });

    for (const listener of this.syncCompletionListeners) {
      try {
        listener(syncItem);
      } catch (error) {
        console.error('[SyncService] Error in sync completion listener:', error);
      }
    }
  }
}

// Singleton instanca
const syncService = new SyncService();

export default syncService;
