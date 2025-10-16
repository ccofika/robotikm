import offlineStorage from './offlineStorage';
import syncQueue from './syncQueue';
import networkMonitor from './networkMonitor';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from './api';
import api from './api';

/**
 * Data Repository
 * Cache-first pristup podacima sa background sync-om
 *
 * Logika:
 * 1. Za GET operacije: Vrati iz cache-a odmah, fetchuj u pozadini ako je online
 * 2. Za POST/PUT/DELETE: Ažuriraj lokalno odmah, dodaj u sync queue
 */

class DataRepository {
  constructor() {
    this.refreshInProgress = new Set();
  }

  // ==================== WORK ORDERS ====================

  /**
   * Vraća radne naloge za tehničara
   * @param {string} technicianId
   * @param {boolean} forceRefresh - Da li da forsira refresh sa servera
   * @returns {Promise<Array>}
   */
  async getWorkOrders(technicianId, forceRefresh = false) {
    try {
      // 1. Vrati iz cache-a odmah
      const cached = await offlineStorage.getWorkOrders(technicianId);

      // 2. Ako je online i nije force refresh, fetchuj u pozadini
      if (networkMonitor.getIsOnline() && !forceRefresh) {
        this.refreshWorkOrders(technicianId);
      }

      // 3. Ako je force refresh i online, čekaj na fresh data
      if (forceRefresh && networkMonitor.getIsOnline()) {
        return await this.refreshWorkOrders(technicianId);
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting work orders:', error);
      return [];
    }
  }

  /**
   * Refreshuje radne naloge sa servera u pozadini
   */
  async refreshWorkOrders(technicianId) {
    // Spreči multiple refresh-eve u isto vreme
    const key = `workOrders_${technicianId}`;
    if (this.refreshInProgress.has(key)) {
      return await offlineStorage.getWorkOrders(technicianId);
    }

    this.refreshInProgress.add(key);

    try {
      const response = await workOrdersAPI.getTechnicianWorkOrders(technicianId);
      const workOrders = response.data;

      // Sačuvaj u cache
      await offlineStorage.saveWorkOrders(technicianId, workOrders);
      await offlineStorage.setLastSync('workOrders', technicianId);

      console.log(`[DataRepository] Refreshed ${workOrders.length} work orders for technician ${technicianId}`);
      return workOrders;
    } catch (error) {
      console.error('[DataRepository] Error refreshing work orders:', error);
      // Vrati cached verziju ako refresh ne uspe
      return await offlineStorage.getWorkOrders(technicianId);
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  /**
   * Vraća pojedinačan radni nalog
   */
  async getWorkOrder(technicianId, workOrderId, forceRefresh = false) {
    try {
      // Vrati iz cache-a odmah
      const cached = await offlineStorage.getWorkOrder(technicianId, workOrderId);

      // Ako je online i force refresh, fetchuj sa servera
      if (forceRefresh && networkMonitor.getIsOnline()) {
        try {
          const response = await workOrdersAPI.getOne(workOrderId);
          const workOrder = response.data;

          // Ažuriraj u cache-u
          await offlineStorage.updateWorkOrder(technicianId, workOrderId, workOrder);

          return workOrder;
        } catch (error) {
          console.error('[DataRepository] Error fetching work order from server:', error);
        }
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting work order:', error);
      return null;
    }
  }

  /**
   * Ažurira radni nalog (offline-first)
   */
  async updateWorkOrder(technicianId, workOrderId, updates) {
    try {
      // 1. Odmah ažuriraj lokalno
      await offlineStorage.updateWorkOrder(technicianId, workOrderId, updates);

      // 2. Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'UPDATE_WORK_ORDER',
        entity: 'workOrders',
        entityId: workOrderId,
        action: 'update',
        data: {
          workOrderId,
          technicianId,
          updates
        }
      });

      console.log(`[DataRepository] Work order ${workOrderId} updated locally and queued for sync`);

      // 3. Ako je online, pokreni sync odmah
      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error updating work order:', error);
      throw error;
    }
  }

  // ==================== EQUIPMENT ====================

  /**
   * Vraća opremu tehničara
   */
  async getEquipment(technicianId, forceRefresh = false) {
    try {
      const cached = await offlineStorage.getEquipment(technicianId);

      if (networkMonitor.getIsOnline() && !forceRefresh) {
        this.refreshEquipment(technicianId);
      }

      if (forceRefresh && networkMonitor.getIsOnline()) {
        return await this.refreshEquipment(technicianId);
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting equipment:', error);
      return [];
    }
  }

  /**
   * Refreshuje opremu sa servera
   */
  async refreshEquipment(technicianId) {
    const key = `equipment_${technicianId}`;
    if (this.refreshInProgress.has(key)) {
      return await offlineStorage.getEquipment(technicianId);
    }

    this.refreshInProgress.add(key);

    try {
      const response = await techniciansAPI.getEquipment(technicianId);
      const equipment = response.data;

      await offlineStorage.saveEquipment(technicianId, equipment);
      await offlineStorage.setLastSync('equipment', technicianId);

      console.log(`[DataRepository] Refreshed ${equipment.length} equipment items`);
      return equipment;
    } catch (error) {
      console.error('[DataRepository] Error refreshing equipment:', error);
      return await offlineStorage.getEquipment(technicianId);
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  // ==================== MATERIALS ====================

  /**
   * Vraća materijale tehničara
   */
  async getMaterials(technicianId, forceRefresh = false) {
    try {
      const cached = await offlineStorage.getMaterials(technicianId);

      if (networkMonitor.getIsOnline() && !forceRefresh) {
        this.refreshMaterials(technicianId);
      }

      if (forceRefresh && networkMonitor.getIsOnline()) {
        return await this.refreshMaterials(technicianId);
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting materials:', error);
      return [];
    }
  }

  /**
   * Refreshuje materijale sa servera
   */
  async refreshMaterials(technicianId) {
    const key = `materials_${technicianId}`;
    if (this.refreshInProgress.has(key)) {
      return await offlineStorage.getMaterials(technicianId);
    }

    this.refreshInProgress.add(key);

    try {
      const response = await techniciansAPI.getMaterials(technicianId);
      const materials = response.data;

      await offlineStorage.saveMaterials(technicianId, materials);
      await offlineStorage.setLastSync('materials', technicianId);

      console.log(`[DataRepository] Refreshed ${materials.length} materials`);
      return materials;
    } catch (error) {
      console.error('[DataRepository] Error refreshing materials:', error);
      return await offlineStorage.getMaterials(technicianId);
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  /**
   * Ažurira korišćene materijale za radni nalog
   */
  async updateUsedMaterials(technicianId, workOrderId, materials) {
    try {
      // Ažuriraj lokalno
      await offlineStorage.updateWorkOrder(technicianId, workOrderId, { materials });

      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'UPDATE_USED_MATERIALS',
        entity: 'workOrders',
        entityId: workOrderId,
        action: 'update',
        data: {
          workOrderId,
          technicianId,
          materials
        }
      });

      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error updating used materials:', error);
      throw error;
    }
  }

  // ==================== USER EQUIPMENT ====================

  /**
   * Vraća opremu korisnika za radni nalog
   */
  async getUserEquipment(workOrderId, forceRefresh = false) {
    try {
      const cached = await offlineStorage.getUserEquipment(workOrderId);

      if (networkMonitor.getIsOnline() && !forceRefresh) {
        this.refreshUserEquipment(workOrderId);
      }

      if (forceRefresh && networkMonitor.getIsOnline()) {
        return await this.refreshUserEquipment(workOrderId);
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting user equipment:', error);
      return [];
    }
  }

  /**
   * Refreshuje opremu korisnika sa servera
   */
  async refreshUserEquipment(workOrderId) {
    const key = `userEquipment_${workOrderId}`;
    if (this.refreshInProgress.has(key)) {
      return await offlineStorage.getUserEquipment(workOrderId);
    }

    this.refreshInProgress.add(key);

    try {
      const response = await workOrdersAPI.getUserEquipment(workOrderId);
      const userEquipment = response.data;

      await offlineStorage.saveUserEquipment(workOrderId, userEquipment);

      console.log(`[DataRepository] Refreshed user equipment for work order ${workOrderId}`);
      return userEquipment;
    } catch (error) {
      console.error('[DataRepository] Error refreshing user equipment:', error);
      return await offlineStorage.getUserEquipment(workOrderId);
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  /**
   * Dodaje opremu korisniku
   */
  async addUserEquipment(workOrderId, equipmentData) {
    try {
      // Dodaj lokalno optimistično
      const currentEquipment = await offlineStorage.getUserEquipment(workOrderId);
      const newEquipment = {
        ...equipmentData,
        id: `temp_${Date.now()}`, // Temporary ID
        _pendingSync: true
      };
      currentEquipment.push(newEquipment);
      await offlineStorage.saveUserEquipment(workOrderId, currentEquipment);

      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'ADD_USER_EQUIPMENT',
        entity: 'userEquipment',
        entityId: workOrderId,
        action: 'create',
        data: equipmentData
      });

      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error adding user equipment:', error);
      throw error;
    }
  }

  /**
   * Uklanja opremu korisnika
   */
  async removeUserEquipment(workOrderId, equipmentId, removalData) {
    try {
      // Ukloni lokalno odmah
      const currentEquipment = await offlineStorage.getUserEquipment(workOrderId);
      const updatedEquipment = currentEquipment.filter(eq => eq.id !== equipmentId);
      await offlineStorage.saveUserEquipment(workOrderId, updatedEquipment);

      // Dodaj removed equipment u poseban storage
      const removedEquipment = await offlineStorage.getRemovedEquipment(workOrderId);
      const removedItem = currentEquipment.find(eq => eq.id === equipmentId);
      if (removedItem) {
        removedEquipment.push({
          ...removedItem,
          ...removalData,
          removedAt: Date.now()
        });
        await offlineStorage.saveRemovedEquipment(workOrderId, removedEquipment);
      }

      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'REMOVE_USER_EQUIPMENT',
        entity: 'userEquipment',
        entityId: equipmentId,
        action: 'delete',
        data: {
          workOrderId,
          equipmentId,
          ...removalData
        }
      });

      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error removing user equipment:', error);
      throw error;
    }
  }

  /**
   * Vraća uklonjenu opremu za radni nalog
   */
  async getRemovedEquipment(workOrderId, forceRefresh = false) {
    try {
      const cached = await offlineStorage.getRemovedEquipment(workOrderId);

      if (forceRefresh && networkMonitor.getIsOnline()) {
        try {
          const response = await userEquipmentAPI.getRemovedForWorkOrder(workOrderId);
          const removedEquipment = response.data;
          await offlineStorage.saveRemovedEquipment(workOrderId, removedEquipment);
          return removedEquipment;
        } catch (error) {
          console.error('[DataRepository] Error fetching removed equipment:', error);
        }
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting removed equipment:', error);
      return [];
    }
  }

  // ==================== IMAGES ====================

  /**
   * Upload-uje sliku za radni nalog
   */
  async uploadWorkOrderImage(workOrderId, imageUri, technicianId) {
    try {
      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'UPLOAD_IMAGE',
        entity: 'workOrderImages',
        entityId: workOrderId,
        action: 'create',
        data: {
          workOrderId,
          imageUri,
          technicianId
        }
      });

      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error queueing image upload:', error);
      throw error;
    }
  }

  /**
   * Briše sliku sa radnog naloga
   */
  async deleteWorkOrderImage(workOrderId, imageUrl) {
    try {
      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'DELETE_IMAGE',
        entity: 'workOrderImages',
        entityId: workOrderId,
        action: 'delete',
        data: {
          workOrderId,
          imageUrl
        }
      });

      if (networkMonitor.getIsOnline()) {
        syncQueue.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[DataRepository] Error queueing image deletion:', error);
      throw error;
    }
  }

  // ==================== UTILITY ====================

  /**
   * Forsira pun refresh svih podataka za tehničara
   */
  async forceFullRefresh(technicianId) {
    if (!networkMonitor.getIsOnline()) {
      throw new Error('Cannot refresh - device is offline');
    }

    try {
      console.log('[DataRepository] Starting full refresh...');

      await Promise.all([
        this.refreshWorkOrders(technicianId),
        this.refreshEquipment(technicianId),
        this.refreshMaterials(technicianId)
      ]);

      console.log('[DataRepository] Full refresh completed');
      return true;
    } catch (error) {
      console.error('[DataRepository] Error during full refresh:', error);
      throw error;
    }
  }

  /**
   * Vraća statistiku za data repository
   */
  async getStats(technicianId) {
    return await offlineStorage.getStorageStats(technicianId);
  }
}

// Singleton instanca
const dataRepository = new DataRepository();

export default dataRepository;
