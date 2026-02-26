import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import networkMonitor from '../services/networkMonitor';
import syncQueue from '../services/syncQueue';
import syncService from '../services/syncService';
import dataRepository from '../services/dataRepository';
import { AuthContext } from './AuthContext';

/**
 * Offline Context
 * Pruža globalni pristup offline funkcionalnosti kroz aplikaciju
 */

export const OfflineContext = createContext({
  isOnline: true,
  isSyncing: false,
  pendingActions: 0,
  failedActions: 0,
  hasConflicts: false,
  syncErrors: [],
  conflicts: [],
  forceSyncAll: async () => {},
  retryFailedSync: async () => {},
  resolveConflict: async () => {},
  dismissError: async () => {},
  getQueueStats: async () => {},
});

export const OfflineProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueStats, setQueueStats] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    failed: 0,
    items: []
  });
  const [conflicts, setConflicts] = useState([]);

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    // Inicijalizuj network monitor
    networkMonitor.initialize();

    // Pri startu aplikacije, pokreni storage cleanup
    if (user?._id) {
      import('../services/offlineStorage').then(module => {
        const offlineStorage = module.default;
        offlineStorage.performStorageCleanup(user._id).then(result => {
          if (result) {
            console.log(`[OfflineContext] Startup cleanup: pruned ${result.prunedWorkOrders} work orders, removed ${result.orphanKeysRemoved} orphan keys`);
          }
        });
      });
    }

    // Subscribe na network promene
    const unsubscribeNetwork = networkMonitor.addListener((online) => {
      setIsOnline(online);
      console.log(`[OfflineContext] Network status changed: ${online ? 'Online' : 'Offline'}`);

      // Kada se vrati online, pokreni sync
      if (online) {
        handleGoingOnline();
      }
    });

    // Subscribe na queue promene
    const unsubscribeQueue = syncQueue.addListener((stats) => {
      setQueueStats(stats);

      // isSyncing je true samo ako syncQueue aktivno procesira ILI ima syncing iteme
      // Ali ako su syncing itemi stale (stariji od 5 min), ne smatraj ih aktivnim
      const now = Date.now();
      const STALE_THRESHOLD = 5 * 60 * 1000;
      const activeSyncingItems = stats.items.filter(item =>
        item.status === 'syncing' &&
        item.lastAttempt &&
        (now - item.lastAttempt) < STALE_THRESHOLD
      );
      setIsSyncing(activeSyncingItems.length > 0);

      // Ekstraktuj konflikte
      const conflictItems = stats.items.filter(item => item.conflictData);
      setConflicts(conflictItems);
    });

    // Subscribe na conflict events
    const unsubscribeConflicts = syncService.addConflictHandler((syncItem, conflict) => {
      console.log('[OfflineContext] Conflict detected:', syncItem, conflict);
    });

    // App state listener - pokreni sync kada se vrati u foreground
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribeNetwork();
      unsubscribeQueue();
      unsubscribeConflicts();
      appStateSubscription?.remove();
      networkMonitor.destroy();
    };
  }, [user?._id]);

  // ==================== APP STATE HANDLING ====================

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('[OfflineContext] App became active - checking for sync');

      // Proveri konekciju i pokreni sync ako je potrebno
      networkMonitor.checkConnection().then(online => {
        if (online) {
          // Prvo resetuj zaglavljene syncing iteme
          syncQueue.resetStaleSyncingItems().then(() => {
            // Zatim procesiraj queue ako ima pending itema
            if (queueStats.pending > 0) {
              syncQueue.processQueue();
            }
          });

          // Smart refresh: samo osvežavamo radne naloge (najvažnije za nove naloge)
          // Ne radimo full refresh svih podataka na svaki foreground
          if (user?._id) {
            dataRepository.refreshWorkOrders(user._id).catch(error => {
              console.error('[OfflineContext] Error refreshing work orders on app active:', error);
            });
          }
        }
      });
    }
  };

  // ==================== GOING ONLINE ====================

  const handleGoingOnline = async () => {
    try {
      console.log('[OfflineContext] Device went online - starting sync');

      // 1. Resetuj zaglavljene syncing iteme
      await syncQueue.resetStaleSyncingItems();

      // 2. Pokreni storage cleanup pre refresha
      if (user?._id) {
        const offlineStorageModule = await import('../services/offlineStorage');
        const offlineStorage = offlineStorageModule.default;
        await offlineStorage.performStorageCleanup(user._id);
      }

      // 3. Pokreni sync queue (upload pending promene)
      await syncQueue.processQueue();

      // 4. Refresh radne naloge (najvažnije za nove naloge)
      if (user?._id) {
        await dataRepository.refreshWorkOrders(user._id);
        // Oprema i materijali se refreshuju u pozadini - ne blokiramo
        dataRepository.refreshEquipment(user._id).catch(err =>
          console.error('[OfflineContext] Background equipment refresh error:', err)
        );
        dataRepository.refreshMaterials(user._id).catch(err =>
          console.error('[OfflineContext] Background materials refresh error:', err)
        );
      }
    } catch (error) {
      console.error('[OfflineContext] Error handling going online:', error);
    }
  };

  // ==================== SYNC OPERATIONS ====================

  /**
   * Forsira punu sinhronizaciju
   */
  const forceSyncAll = async () => {
    if (!isOnline) {
      throw new Error('Cannot sync - device is offline');
    }

    try {
      setIsSyncing(true);

      // 1. Storage cleanup pre synca
      if (user?._id) {
        const offlineStorageModule = await import('../services/offlineStorage');
        const offlineStorage = offlineStorageModule.default;
        await offlineStorage.performStorageCleanup(user._id);
      }

      // 2. Resetuj zaglavljene iteme
      await syncQueue.resetStaleSyncingItems();

      // 3. Sync queue
      await syncService.syncAll();

      // 4. Refresh all data
      if (user?._id) {
        await dataRepository.forceFullRefresh(user._id);
      }

      console.log('[OfflineContext] Force sync completed');
    } catch (error) {
      console.error('[OfflineContext] Error during force sync:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Pokušava ponovo sve neuspešne sync-ove
   */
  const retryFailedSync = async () => {
    if (!isOnline) {
      throw new Error('Cannot retry - device is offline');
    }

    try {
      await syncQueue.retryAllFailed();
      console.log('[OfflineContext] Retry scheduled for all failed items');
    } catch (error) {
      console.error('[OfflineContext] Error retrying failed syncs:', error);
      throw error;
    }
  };

  /**
   * Pokušava ponovo pojedinačan neuspešan sync
   */
  const retrySingleSync = async (syncItemId) => {
    if (!isOnline) {
      throw new Error('Cannot retry - device is offline');
    }

    try {
      await syncQueue.retryFailedItem(syncItemId);
      console.log(`[OfflineContext] Retry scheduled for item ${syncItemId}`);
    } catch (error) {
      console.error('[OfflineContext] Error retrying sync item:', error);
      throw error;
    }
  };

  /**
   * Odbacuje/briše neuspešan sync
   */
  const dismissError = async (syncItemId) => {
    try {
      await syncQueue.dismissFailedItem(syncItemId);
      console.log(`[OfflineContext] Dismissed failed item ${syncItemId}`);
    } catch (error) {
      console.error('[OfflineContext] Error dismissing error:', error);
      throw error;
    }
  };

  // ==================== CONFLICT RESOLUTION ====================

  /**
   * Resolves konflikt sa odabranom strategijom
   */
  const resolveConflict = async (syncItemId, strategy, resolution = {}) => {
    try {
      await syncService.resolveConflict(syncItemId, strategy, resolution);
      console.log(`[OfflineContext] Conflict resolved: ${syncItemId} with strategy ${strategy}`);
    } catch (error) {
      console.error('[OfflineContext] Error resolving conflict:', error);
      throw error;
    }
  };

  // ==================== UTILITY ====================

  /**
   * Vraća detaljnu statistiku queue-a
   */
  const getQueueStats = async () => {
    return await syncQueue.getQueueStats();
  };

  /**
   * Vraća sync status
   */
  const getSyncStatus = async () => {
    return await syncService.getSyncStatus();
  };

  /**
   * Vraća sve neuspešne sync iteme
   */
  const getFailedItems = async () => {
    return await syncQueue.getFailedItems();
  };

  // ==================== CONTEXT VALUE ====================

  const value = {
    // Status
    isOnline,
    isSyncing,
    pendingActions: queueStats.pending,
    failedActions: queueStats.failed,
    hasConflicts: conflicts.length > 0,
    queueStats,

    // Errors & Conflicts
    syncErrors: queueStats.items.filter(item => item.status === 'failed' && !item.conflictData),
    conflicts,

    // Operations
    forceSyncAll,
    retryFailedSync,
    retrySingleSync,
    resolveConflict,
    dismissError,
    getQueueStats,
    getSyncStatus,
    getFailedItems,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

/**
 * Custom hook za upotrebu offline context-a
 */
export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
