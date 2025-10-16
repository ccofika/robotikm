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
      REMOVED_EQUIPMENT: 'removedEquipment'
    };
  }

  // ==================== WORK ORDERS ====================

  /**
   * Čuva radne naloge za tehničara
   */
  async saveWorkOrders(technicianId, workOrders) {
    try {
      const key = `${this.STORAGE_KEYS.WORK_ORDERS}_${technicianId}`;
      const data = {
        workOrders,
        lastModified: Date.now()
      };
      await storage.setItem(key, data);
      console.log(`[OfflineStorage] Saved ${workOrders.length} work orders for technician ${technicianId}`);
    } catch (error) {
      console.error('[OfflineStorage] Error saving work orders:', error);
      throw error;
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
   * Ažurira pojedinačan radni nalog
   */
  async updateWorkOrder(technicianId, workOrderId, updates) {
    try {
      const workOrders = await this.getWorkOrders(technicianId);
      const index = workOrders.findIndex(wo => wo._id === workOrderId);

      if (index !== -1) {
        workOrders[index] = {
          ...workOrders[index],
          ...updates,
          lastModified: Date.now()
        };
        await this.saveWorkOrders(technicianId, workOrders);
        console.log(`[OfflineStorage] Updated work order ${workOrderId}`);
      } else {
        console.warn(`[OfflineStorage] Work order ${workOrderId} not found`);
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
      console.log(`[OfflineStorage] Saved ${equipment.length} equipment items for technician ${technicianId}`);
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
      console.log(`[OfflineStorage] Saved ${materials.length} materials for technician ${technicianId}`);
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
      console.log(`[OfflineStorage] Saved user equipment for work order ${workOrderId}`);
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
      console.log(`[OfflineStorage] Saved removed equipment for work order ${workOrderId}`);
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
      console.log(`[OfflineStorage] Saved ${images.length} images for work order ${workOrderId}`);
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

  // ==================== UTILITY ====================

  /**
   * Briše sve lokalne podatke za tehničara
   */
  async clearTechnicianData(technicianId) {
    try {
      const keys = [
        `${this.STORAGE_KEYS.WORK_ORDERS}_${technicianId}`,
        `${this.STORAGE_KEYS.EQUIPMENT}_${technicianId}`,
        `${this.STORAGE_KEYS.MATERIALS}_${technicianId}`
      ];

      for (const key of keys) {
        await storage.removeItem(key);
      }

      console.log(`[OfflineStorage] Cleared all data for technician ${technicianId}`);
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
