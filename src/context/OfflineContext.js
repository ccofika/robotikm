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
      setIsSyncing(stats.syncing > 0);

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
  }, []);

  // ==================== APP STATE HANDLING ====================

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('[OfflineContext] App became active - checking for sync');

      // Proveri konekciju i pokreni sync ako je potrebno
      networkMonitor.checkConnection().then(online => {
        if (online && queueStats.pending > 0) {
          syncQueue.processQueue();
        }
      });

      // Refresh data ako je korisnik ulogovan
      if (user?._id && isOnline) {
        dataRepository.forceFullRefresh(user._id).catch(error => {
          console.error('[OfflineContext] Error refreshing data on app active:', error);
        });
      }
    }
  };

  // ==================== GOING ONLINE ====================

  const handleGoingOnline = async () => {
    try {
      console.log('[OfflineContext] Device went online - starting sync');

      // Pokreni sync queue
      await syncQueue.processQueue();

      // Refresh data ako je korisnik ulogovan
      if (user?._id) {
        await dataRepository.forceFullRefresh(user._id);
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

      // Sync queue
      await syncService.syncAll();

      // Refresh all data
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
