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
      console.log('[DataRepository] Adding user equipment:', { workOrderId, equipmentData });

      // Ako je online, dodaj direktno na server i refresh
      if (networkMonitor.getIsOnline()) {
        try {
          await userEquipmentAPI.add(equipmentData);

          // Odmah refresh user equipment sa servera
          const response = await workOrdersAPI.getUserEquipment(workOrderId);
          await offlineStorage.saveUserEquipment(workOrderId, response.data);

          console.log('[DataRepository] Equipment added and refreshed from server');
          return true;
        } catch (error) {
          console.error('[DataRepository] Error adding equipment online:', error);
          throw error;
        }
      }

      // Ako je offline, dodaj u queue i sačuvaj lokalno sa temp ID-em
      const currentEquipment = await offlineStorage.getUserEquipment(workOrderId);
      const technicianEquipment = await offlineStorage.getEquipment(equipmentData.technicianId);

      // Pronađi opremu iz tehničarevog inventara da dobijemo description i serialNumber
      const selectedEq = technicianEquipment.find(eq => eq._id === equipmentData.equipmentId);

      const newEquipment = {
        ...equipmentData,
        id: `temp_${Date.now()}`, // Temporary ID
        _id: `temp_${Date.now()}`,
        description: selectedEq?.description || 'Pending sync...',
        serialNumber: selectedEq?.serialNumber || 'N/A',
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

      console.log('[DataRepository] Equipment queued for sync (offline)');
      return true;
    } catch (error) {
      console.error('[DataRepository] Error adding user equipment:', error);
      throw error;
    }
  }

  /**
   * Uklanja DODATU opremu korisnika (oprema koja je instalirana sa liste tehničara)
   * OVO NIJE ZA REMOVED EQUIPMENT - to je posebna funkcija removeEquipmentBySerial
   */
  async removeUserEquipment(workOrderId, equipmentId, removalData) {
    try {
      console.log('[DataRepository] Removing installed user equipment:', { workOrderId, equipmentId, removalData });

      // Ukloni lokalno odmah
      const currentEquipment = await offlineStorage.getUserEquipment(workOrderId);

      // Filter opremu - proveri oba ID polja (id i _id) jer oprema sa servera ima _id, temp ima id
      const updatedEquipment = currentEquipment.filter(eq => {
        const eqId = eq.id || eq._id;
        return eqId !== equipmentId;
      });

      // Pronađi uklonjenu opremu - proveri oba ID polja
      const removedItem = currentEquipment.find(eq => {
        const eqId = eq.id || eq._id;
        return eqId === equipmentId;
      });

      if (!removedItem) {
        console.warn(`[DataRepository] Equipment ${equipmentId} not found in current equipment list`);
        return false;
      }

      console.log('[DataRepository] Found equipment to remove from installed list:', {
        description: removedItem.description,
        serialNumber: removedItem.serialNumber,
        isPendingSync: removedItem._pendingSync
      });

      // Sačuvaj ažuriranu listu opreme (samo uklanjanje iz instalirane opreme)
      await offlineStorage.saveUserEquipment(workOrderId, updatedEquipment);

      // VAŽNO: Ako je oprema pending sync (temp ID), NE dodavaj u sync queue za removal
      // jer ona nije ni dodana na server još
      if (removedItem._pendingSync) {
        console.log('[DataRepository] Equipment has temp ID (_pendingSync), removing from add queue instead');

        // Ukloni iz ADD sync queue ako postoji
        const queue = await syncQueue.getQueue();
        const addItem = queue.find(item =>
          item.type === 'ADD_USER_EQUIPMENT' &&
          item.data.equipmentId === removalData.equipmentId &&
          item.data.workOrderId === workOrderId
        );

        if (addItem) {
          await syncQueue.removeFromQueue(addItem.id);
          console.log('[DataRepository] Removed pending ADD from sync queue');
        }

        return true;
      }

      // Ako oprema ima pravi server ID, dodaj u sync queue za removal
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

      console.log('[DataRepository] Equipment removal queued for sync');

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
   * Uklanja opremu po serijskom broju (ručno uneti naziv i S/N)
   * OVO JE POTPUNO ODVOJENO OD addUserEquipment - ovo je za opremu koja se uklanja sa lokacije
   */
  async removeEquipmentBySerial(workOrderId, equipmentData) {
    try {
      const { technicianId, equipmentName, serialNumber, condition } = equipmentData;

      console.log('[DataRepository] Removing equipment by serial:', {
        workOrderId,
        equipmentName,
        serialNumber,
        condition
      });

      // Ako je online, odmah pošalji na server
      if (networkMonitor.getIsOnline()) {
        try {
          await userEquipmentAPI.removeBySerial({
            workOrderId,
            technicianId,
            equipmentName,
            serialNumber,
            condition
          });

          // Odmah refresh removed equipment sa servera
          const response = await userEquipmentAPI.getRemovedForWorkOrder(workOrderId);
          await offlineStorage.saveRemovedEquipment(workOrderId, response.data);

          console.log('[DataRepository] Equipment removed by serial and refreshed from server');
          return true;
        } catch (error) {
          console.error('[DataRepository] Error removing equipment by serial online:', error);
          throw error;
        }
      }

      // Ako je offline, sačuvaj lokalno i dodaj u sync queue
      const removedEquipment = await offlineStorage.getRemovedEquipment(workOrderId);

      const newRemovedEquipment = {
        id: `temp_removed_${Date.now()}`,
        equipmentType: equipmentName,
        serialNumber,
        condition: condition === 'ispravna' ? 'ispravna' : 'neispravna',
        removedAt: new Date().toISOString(),
        notes: `Uklonjeno od tehničara - ${equipmentName}`,
        _pendingSync: true
      };

      removedEquipment.push(newRemovedEquipment);
      await offlineStorage.saveRemovedEquipment(workOrderId, removedEquipment);

      // Dodaj u sync queue
      await syncQueue.addToQueue({
        type: 'REMOVE_EQUIPMENT_BY_SERIAL',
        entity: 'removedEquipment',
        entityId: workOrderId,
        action: 'create',
        data: {
          workOrderId,
          technicianId,
          equipmentName,
          serialNumber,
          condition
        }
      });

      console.log('[DataRepository] Equipment removal by serial queued for sync (offline)');
      return true;
    } catch (error) {
      console.error('[DataRepository] Error removing equipment by serial:', error);
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

      // Refresh u pozadini ako je online
      if (networkMonitor.getIsOnline() && !forceRefresh) {
        this.refreshRemovedEquipment(workOrderId);
      }

      return cached;
    } catch (error) {
      console.error('[DataRepository] Error getting removed equipment:', error);
      return [];
    }
  }

  /**
   * Refreshuje uklonjenu opremu sa servera u pozadini
   */
  async refreshRemovedEquipment(workOrderId) {
    const key = `removedEquipment_${workOrderId}`;
    if (this.refreshInProgress.has(key)) {
      return await offlineStorage.getRemovedEquipment(workOrderId);
    }

    this.refreshInProgress.add(key);

    try {
      const response = await userEquipmentAPI.getRemovedForWorkOrder(workOrderId);
      const removedEquipment = response.data;

      await offlineStorage.saveRemovedEquipment(workOrderId, removedEquipment);

      console.log(`[DataRepository] Refreshed removed equipment for work order ${workOrderId}`);
      return removedEquipment;
    } catch (error) {
      console.error('[DataRepository] Error refreshing removed equipment:', error);
      return await offlineStorage.getRemovedEquipment(workOrderId);
    } finally {
      this.refreshInProgress.delete(key);
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
