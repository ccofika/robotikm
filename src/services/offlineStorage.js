import { storage } from '../utils/storage';

/**
 * Offline Storage Service
 * Upravlja lokalnim skladištenjem svih podataka za offline funkcionalnost
 *
 * Storage struktura:
 * - workOrders_{technicianId}: Radni nalozi za tehničara
 * - equipment_{technicianId}: Oprema tehničara
 * - materials_{technicianId}: Materijali tehničara
 * - userEquipment_{workOrderId}: Oprema korisnika za radni nalog
 * - workOrderImages_{workOrderId}: Slike za radni nalog
 * - syncQueue: Red čekanja za sinhronizaciju
 * - lastSync_{entity}: Timestamp poslednje sinhronizacije
 */

class OfflineStorage {
  constructor() {
    this.STORAGE_KEYS = {
      WORK_ORDERS: 'workOrders',
      EQUIPMENT: 'equipment',
      MATERIALS: 'materials',
      USER_EQUIPMENT: 'userEquipment',
      WORK_ORDER_IMAGES: 'workOrderImages',
      SYNC_QUEUE: 'syncQueue',
      LAST_SYNC: 'lastSync',
      REMOVED_EQUIPMENT: 'removedEquipment',
      UPLOADED_IMAGE_NAMES: 'uploadedImageNames'
    };
  }

  // ==================== WORK ORDERS ====================

  /**
   * Čuva radne naloge za tehničara.
   * Automatski filtrira stare završene naloge pre čuvanja da bi se uštedeo prostor.
   */
  async saveWorkOrders(technicianId, workOrders) {
    try {
      const key = `${this.STORAGE_KEYS.WORK_ORDERS}_${technicianId}`;

      // Pre čuvanja, filtriraj stare završene naloge
      const filteredWorkOrders = this._filterWorkOrdersForStorage(workOrders);

      const data = {
        workOrders: filteredWorkOrders,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);

      if (filteredWorkOrders.length < workOrders.length) {
        console.log(`[OfflineStorage] Offline cache: filtered out ${workOrders.length - filteredWorkOrders.length} old completed work orders (cached ${filteredWorkOrders.length} for offline use)`);

        // Obriši per-workOrder podatke za filtrirane naloge
        const filteredIds = new Set(filteredWorkOrders.map(wo => wo._id));
        const removedIds = workOrders
          .filter(wo => !filteredIds.has(wo._id))
          .map(wo => wo._id);
        await this._cleanupRemovedWorkOrderData(removedIds);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error saving work orders:', error);
      throw error;
    }
  }

  /**
   * Filtrira radne naloge za čuvanje - čuva samo aktivne + nedavno završene (24h)
   */
  _filterWorkOrdersForStorage(workOrders) {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const completedStatuses = ['zavrsen', 'completed', 'cancelled', 'otkazan'];

    return workOrders.filter(wo => {
      const status = (wo.status || '').toLowerCase();
      if (!completedStatuses.includes(status)) return true;

      const completedAt = wo.completedAt || wo.lastModified || wo.updatedAt;
      const completedTime = completedAt ? new Date(completedAt).getTime() : 0;
      return (now - completedTime) < TWENTY_FOUR_HOURS;
    });
  }

  /**
   * Čisti per-workOrder podatke za uklonjene naloge (fire-and-forget)
   */
  async _cleanupRemovedWorkOrderData(removedWorkOrderIds) {
    try {
      if (!removedWorkOrderIds || removedWorkOrderIds.length === 0) return;

      const keysToRemove = [];
      for (const woId of removedWorkOrderIds) {
        keysToRemove.push(`${this.STORAGE_KEYS.USER_EQUIPMENT}_${woId}`);
        keysToRemove.push(`${this.STORAGE_KEYS.REMOVED_EQUIPMENT}_${woId}`);
        keysToRemove.push(`${this.STORAGE_KEYS.WORK_ORDER_IMAGES}_${woId}`);
      }
      await storage.multiRemove(keysToRemove);
    } catch (error) {
      console.error('[OfflineStorage] Error cleaning up removed work order data:', error);
    }
  }

  /**
   * Učitava radne naloge za tehničara
   */
  async getWorkOrders(technicianId) {
    try {
      const key = `${this.STORAGE_KEYS.WORK_ORDERS}_${technicianId}`;
      const data = await storage.getItem(key);
      return data?.workOrders || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading work orders:', error);
      return [];
    }
  }

  /**
   * Ažurira pojedinačan radni nalog (ili ga dodaje ako ne postoji u kešu)
   */
  async updateWorkOrder(technicianId, workOrderId, updates) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      const index = workOrders.findIndex(wo => wo._id === workOrderId);

      if (index !== -1) {
        // Radni nalog postoji - ažuriraj ga
        workOrders[index] = {
          ...workOrders[index],
          ...updates,
          lastModified: Date.now()
        };
        await this.saveWorkOrders(technicianId, workOrders);
        console.log(`[OfflineStorage] Updated work order ${workOrderId}`);
      } else {
        // Radni nalog ne postoji u kešu - dodaj ga
        console.log(`[OfflineStorage] Work order ${workOrderId} not found in cache, adding it`);
        const newWorkOrder = {
          ...updates,
          _id: workOrderId,
          lastModified: Date.now()
        };
        workOrders.push(newWorkOrder);
        await this.saveWorkOrders(technicianId, workOrders);
        console.log(`[OfflineStorage] Added work order ${workOrderId} to cache`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error updating work order:', error);
      throw error;
    }
  }

  /**
   * Vraća pojedinačan radni nalog
   */
  async getWorkOrder(technicianId, workOrderId) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      return workOrders.find(wo => wo._id === workOrderId) || null;
    } catch (error) {
      console.error('[OfflineStorage] Error loading work order:', error);
      return null;
    }
  }

  // ==================== EQUIPMENT ====================

  /**
   * Čuva opremu tehničara
   */
  async saveEquipment(technicianId, equipment) {
    try {
      const key = `${this.STORAGE_KEYS.EQUIPMENT}_${technicianId}`;
      const data = {
        equipment,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
    } catch (error) {
      console.error('[OfflineStorage] Error saving equipment:', error);
      throw error;
    }
  }

  /**
   * Učitava opremu tehničara
   */
  async getEquipment(technicianId) {
    try {
      const key = `${this.STORAGE_KEYS.EQUIPMENT}_${technicianId}`;
      const data = await storage.getItem(key);
      return data?.equipment || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading equipment:', error);
      return [];
    }
  }

  // ==================== MATERIALS ====================

  /**
   * Čuva materijale tehničara
   */
  async saveMaterials(technicianId, materials) {
    try {
      const key = `${this.STORAGE_KEYS.MATERIALS}_${technicianId}`;
      const data = {
        materials,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
    } catch (error) {
      console.error('[OfflineStorage] Error saving materials:', error);
      throw error;
    }
  }

  /**
   * Učitava materijale tehničara
   */
  async getMaterials(technicianId) {
    try {
      const key = `${this.STORAGE_KEYS.MATERIALS}_${technicianId}`;
      const data = await storage.getItem(key);
      return data?.materials || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading materials:', error);
      return [];
    }
  }

  // ==================== USER EQUIPMENT ====================

  /**
   * Čuva opremu korisnika za radni nalog
   */
  async saveUserEquipment(workOrderId, userEquipment) {
    try {
      const key = `${this.STORAGE_KEYS.USER_EQUIPMENT}_${workOrderId}`;
      const data = {
        userEquipment,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
    } catch (error) {
      console.error('[OfflineStorage] Error saving user equipment:', error);
      throw error;
    }
  }

  /**
   * Učitava opremu korisnika za radni nalog
   */
  async getUserEquipment(workOrderId) {
    try {
      const key = `${this.STORAGE_KEYS.USER_EQUIPMENT}_${workOrderId}`;
      const data = await storage.getItem(key);
      return data?.userEquipment || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading user equipment:', error);
      return [];
    }
  }

  /**
   * Čuva uklonjenu opremu za radni nalog
   */
  async saveRemovedEquipment(workOrderId, removedEquipment) {
    try {
      const key = `${this.STORAGE_KEYS.REMOVED_EQUIPMENT}_${workOrderId}`;
      const data = {
        removedEquipment,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
    } catch (error) {
      console.error('[OfflineStorage] Error saving removed equipment:', error);
      throw error;
    }
  }

  /**
   * Učitava uklonjenu opremu za radni nalog
   */
  async getRemovedEquipment(workOrderId) {
    try {
      const key = `${this.STORAGE_KEYS.REMOVED_EQUIPMENT}_${workOrderId}`;
      const data = await storage.getItem(key);
      return data?.removedEquipment || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading removed equipment:', error);
      return [];
    }
  }

  // ==================== IMAGES ====================

  /**
   * Čuva URL-ove slika za radni nalog
   */
  async saveWorkOrderImages(workOrderId, images) {
    try {
      const key = `${this.STORAGE_KEYS.WORK_ORDER_IMAGES}_${workOrderId}`;
      const data = {
        images,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
    } catch (error) {
      console.error('[OfflineStorage] Error saving work order images:', error);
      throw error;
    }
  }

  /**
   * Učitava URL-ove slika za radni nalog
   */
  async getWorkOrderImages(workOrderId) {
    try {
      const key = `${this.STORAGE_KEYS.WORK_ORDER_IMAGES}_${workOrderId}`;
      const data = await storage.getItem(key);
      return data?.images || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading work order images:', error);
      return [];
    }
  }

  // ==================== UPLOADED IMAGE NAMES (DUPLICATE DETECTION) ====================

  /**
   * Vraća set uploadovanih imena slika za tehničara
   */
  async getUploadedImageNames(technicianId) {
    try {
      const key = `${this.STORAGE_KEYS.UPLOADED_IMAGE_NAMES}_${technicianId}`;
      const data = await storage.getItem(key);
      return data?.imageNames || [];
    } catch (error) {
      console.error('[OfflineStorage] Error loading uploaded image names:', error);
      return [];
    }
  }

  /**
   * Dodaje ime slike u listu uploadovanih za tehničara
   */
  async addUploadedImageName(technicianId, imageName) {
    try {
      const key = `${this.STORAGE_KEYS.UPLOADED_IMAGE_NAMES}_${technicianId}`;
      const existing = await this.getUploadedImageNames(technicianId);

      // Dodaj samo ako već ne postoji
      if (!existing.includes(imageName)) {
        existing.push(imageName);
        await storage.setItem(key, { imageNames: existing, lastModified: Date.now() });
        console.log(`[OfflineStorage] Added uploaded image name: ${imageName}`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error adding uploaded image name:', error);
    }
  }

  /**
   * Proverava da li je slika sa datim imenom već uploadovana
   */
  async isImageAlreadyUploaded(technicianId, imageName) {
    try {
      const uploadedNames = await this.getUploadedImageNames(technicianId);
      return uploadedNames.includes(imageName);
    } catch (error) {
      console.error('[OfflineStorage] Error checking if image is uploaded:', error);
      return false;
    }
  }

  /**
   * Proverava koje slike od datih su već uploadovane
   * Vraća objekat sa listama: { duplicates: [...], newImages: [...] }
   */
  async checkDuplicateImages(technicianId, imageNames) {
    try {
      const uploadedNames = await this.getUploadedImageNames(technicianId);
      const duplicates = [];
      const newImages = [];

      for (const name of imageNames) {
        if (uploadedNames.includes(name)) {
          duplicates.push(name);
        } else {
          newImages.push(name);
        }
      }

      return { duplicates, newImages };
    } catch (error) {
      console.error('[OfflineStorage] Error checking duplicate images:', error);
      return { duplicates: [], newImages: imageNames };
    }
  }

  // ==================== SYNC METADATA ====================

  /**
   * Čuva timestamp poslednje sinhronizacije za entitet
   */
  async setLastSync(entityType, technicianId = null) {
    try {
      const key = `${this.STORAGE_KEYS.LAST_SYNC}_${entityType}${technicianId ? `_${technicianId}` : ''}`;
      await storage.setItem(key, Date.now());
    } catch (error) {
      console.error('[OfflineStorage] Error setting last sync:', error);
    }
  }

  /**
   * Vraća timestamp poslednje sinhronizacije za entitet
   */
  async getLastSync(entityType, technicianId = null) {
    try {
      const key = `${this.STORAGE_KEYS.LAST_SYNC}_${entityType}${technicianId ? `_${technicianId}` : ''}`;
      return await storage.getItem(key) || 0;
    } catch (error) {
      console.error('[OfflineStorage] Error getting last sync:', error);
      return 0;
    }
  }

  // ==================== DATA PRUNING ====================

  /**
   * Čisti završene radne naloge iz lokalnog storage-a.
   * Čuva samo aktivne naloge + naloge završene u poslednjih 24h.
   * Takođe briše povezane userEquipment/removedEquipment/images ključeve za uklonjene naloge.
   */
  async pruneCompletedWorkOrders(technicianId) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      if (!workOrders || workOrders.length === 0) return { pruned: 0, kept: 0 };

      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      // Statusi koji znače "završen"
      const completedStatuses = ['zavrsen', 'completed', 'cancelled', 'otkazan'];

      const activeWorkOrders = [];
      const prunedWorkOrderIds = [];

      for (const wo of workOrders) {
        const status = (wo.status || '').toLowerCase();
        const isCompleted = completedStatuses.includes(status);

        if (!isCompleted) {
          // Aktivan nalog - zadrži
          activeWorkOrders.push(wo);
        } else {
          // Završen nalog - proveri koliko davno
          const completedAt = wo.completedAt || wo.lastModified || wo.updatedAt;
          const completedTime = completedAt ? new Date(completedAt).getTime() : 0;
          const age = now - completedTime;

          if (age < TWENTY_FOUR_HOURS) {
            // Završen nedavno - zadrži
            activeWorkOrders.push(wo);
          } else {
            // Star završen nalog - pruniraj
            prunedWorkOrderIds.push(wo._id);
          }
        }
      }

      if (prunedWorkOrderIds.length === 0) {
        return { pruned: 0, kept: activeWorkOrders.length };
      }

      // Sačuvaj samo aktivne naloge
      await this.saveWorkOrders(technicianId, activeWorkOrders);

      // Obriši povezane per-workOrder ključeve
      const keysToRemove = [];
      for (const woId of prunedWorkOrderIds) {
        keysToRemove.push(`${this.STORAGE_KEYS.USER_EQUIPMENT}_${woId}`);
        keysToRemove.push(`${this.STORAGE_KEYS.REMOVED_EQUIPMENT}_${woId}`);
        keysToRemove.push(`${this.STORAGE_KEYS.WORK_ORDER_IMAGES}_${woId}`);
      }

      if (keysToRemove.length > 0) {
        await storage.multiRemove(keysToRemove);
      }

      console.log(`[OfflineStorage] Pruned ${prunedWorkOrderIds.length} completed work orders, kept ${activeWorkOrders.length}`);
      return { pruned: prunedWorkOrderIds.length, kept: activeWorkOrders.length };
    } catch (error) {
      console.error('[OfflineStorage] Error pruning completed work orders:', error);
      return { pruned: 0, kept: 0 };
    }
  }

  /**
   * Čisti orphan per-workOrder ključeve koji više nemaju odgovarajući radni nalog.
   */
  async cleanOrphanedWorkOrderData(technicianId) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      const activeWorkOrderIds = new Set(workOrders.map(wo => wo._id));

      const allKeys = await storage.getAllKeys();
      const prefixes = [
        this.STORAGE_KEYS.USER_EQUIPMENT + '_',
        this.STORAGE_KEYS.REMOVED_EQUIPMENT + '_',
        this.STORAGE_KEYS.WORK_ORDER_IMAGES + '_'
      ];

      const keysToRemove = [];
      for (const key of allKeys) {
        for (const prefix of prefixes) {
          if (key.startsWith(prefix)) {
            const woId = key.substring(prefix.length);
            if (!activeWorkOrderIds.has(woId)) {
              keysToRemove.push(key);
            }
          }
        }
      }

      if (keysToRemove.length > 0) {
        await storage.multiRemove(keysToRemove);
        console.log(`[OfflineStorage] Cleaned ${keysToRemove.length} orphaned work order data keys`);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('[OfflineStorage] Error cleaning orphaned data:', error);
      return 0;
    }
  }

  /**
   * Čisti uploadovane image names starije od 7 dana
   */
  async pruneUploadedImageNames(technicianId) {
    try {
      const key = `${this.STORAGE_KEYS.UPLOADED_IMAGE_NAMES}_${technicianId}`;
      const data = await storage.getItem(key);
      if (!data || !data.imageNames) return;

      // Čuvamo max 200 najnovijih imena
      if (data.imageNames.length > 200) {
        data.imageNames = data.imageNames.slice(-200);
        await storage.setItem(key, { imageNames: data.imageNames, lastModified: Date.now() });
        console.log(`[OfflineStorage] Pruned uploaded image names to 200`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error pruning uploaded image names:', error);
    }
  }

  /**
   * Pokreće kompletan ciklus čišćenja storage-a
   */
  async performStorageCleanup(technicianId) {
    try {
      console.log('[OfflineStorage] Starting storage cleanup...');

      const pruneResult = await this.pruneCompletedWorkOrders(technicianId);
      const orphansRemoved = await this.cleanOrphanedWorkOrderData(technicianId);
      await this.pruneUploadedImageNames(technicianId);

      console.log(`[OfflineStorage] Storage cleanup complete: pruned ${pruneResult.pruned} work orders, removed ${orphansRemoved} orphan keys, kept ${pruneResult.kept} active work orders`);

      return {
        prunedWorkOrders: pruneResult.pruned,
        orphanKeysRemoved: orphansRemoved,
        activeWorkOrders: pruneResult.kept
      };
    } catch (error) {
      console.error('[OfflineStorage] Error during storage cleanup:', error);
      return null;
    }
  }

  // ==================== UTILITY ====================

  /**
   * Briše sve lokalne podatke za tehničara
   */
  async clearTechnicianData(technicianId) {
    try {
      const keys = [
        `${this.STORAGE_KEYS.WORK_ORDERS}_${technicianId}`,
        `${this.STORAGE_KEYS.EQUIPMENT}_${technicianId}`,
        `${this.STORAGE_KEYS.MATERIALS}_${technicianId}`,
        `${this.STORAGE_KEYS.UPLOADED_IMAGE_NAMES}_${technicianId}`
      ];

      // Takođe obriši per-workOrder ključeve
      const allKeys = await storage.getAllKeys();
      const prefixes = [
        this.STORAGE_KEYS.USER_EQUIPMENT + '_',
        this.STORAGE_KEYS.REMOVED_EQUIPMENT + '_',
        this.STORAGE_KEYS.WORK_ORDER_IMAGES + '_'
      ];
      for (const key of allKeys) {
        for (const prefix of prefixes) {
          if (key.startsWith(prefix)) {
            keys.push(key);
          }
        }
      }

      await storage.multiRemove(keys);

      console.log(`[OfflineStorage] Cleared all data for technician ${technicianId} (${keys.length} keys)`);
    } catch (error) {
      console.error('[OfflineStorage] Error clearing technician data:', error);
      throw error;
    }
  }

  /**
   * Briše sve lokalne podatke
   */
  async clearAllData() {
    try {
      await storage.clear();
      console.log('[OfflineStorage] Cleared all offline data');
    } catch (error) {
      console.error('[OfflineStorage] Error clearing all data:', error);
      throw error;
    }
  }

  /**
   * Vraća statistiku o lokalnom skladištu
   */
  async getStorageStats(technicianId) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      const equipment = await this.getEquipment(technicianId);
      const materials = await this.getMaterials(technicianId);

      return {
        workOrdersCount: workOrders.length,
        equipmentCount: equipment.length,
        materialsCount: materials.length,
        lastSync: {
          workOrders: await this.getLastSync('workOrders', technicianId),
          equipment: await this.getLastSync('equipment', technicianId),
          materials: await this.getLastSync('materials', technicianId)
        }
      };
    } catch (error) {
      console.error('[OfflineStorage] Error getting storage stats:', error);
      return null;
    }
  }
}

// Singleton instanca
const offlineStorage = new OfflineStorage();

export default offlineStorage;
