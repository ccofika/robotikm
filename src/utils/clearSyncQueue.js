import syncQueue from '../services/syncQueue';

/**
 * Utility funkcija za čišćenje sync queue-a
 * Koristi se za debugging i maintenance
 */

/**
 * Briše sve failed iteme iz queue-a
 */
export const clearFailedItems = async () => {
  try {
    const queue = await syncQueue.getQueue();
    const failedItems = queue.filter(item => item.status === 'failed');

    console.log(`[ClearSyncQueue] Found ${failedItems.length} failed items`);

    for (const item of failedItems) {
      await syncQueue.removeFromQueue(item.id);
      console.log(`[ClearSyncQueue] Removed failed item: ${item.type} (${item.id})`);
    }

    console.log(`[ClearSyncQueue] Successfully removed ${failedItems.length} failed items`);
    return failedItems.length;
  } catch (error) {
    console.error('[ClearSyncQueue] Error clearing failed items:', error);
    throw error;
  }
};

/**
 * Briše SVE iteme iz queue-a (koristi pažljivo!)
 */
export const clearAllItems = async () => {
  try {
    await syncQueue.clearQueue();
    console.log('[ClearSyncQueue] All items cleared from queue');
  } catch (error) {
    console.error('[ClearSyncQueue] Error clearing all items:', error);
    throw error;
  }
};

/**
 * Prikazuje sve iteme u queue-u
 */
export const listQueueItems = async () => {
  try {
    const stats = await syncQueue.getQueueStats();

    console.log('[ClearSyncQueue] Queue Stats:', {
      total: stats.total,
      pending: stats.pending,
      syncing: stats.syncing,
      failed: stats.failed
    });

    console.log('[ClearSyncQueue] Queue Items:');
    stats.items.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.status}] ${item.type} (${item.id})`, {
        retryCount: item.retryCount,
        error: item.error,
        timestamp: new Date(item.timestamp).toLocaleString()
      });
    });

    return stats;
  } catch (error) {
    console.error('[ClearSyncQueue] Error listing queue items:', error);
    throw error;
  }
};

// Export za globalnu upotrebu (debugging)
if (__DEV__) {
  global.clearFailedSyncItems = clearFailedItems;
  global.clearAllSyncItems = clearAllItems;
  global.listSyncQueue = listQueueItems;

  console.log('[ClearSyncQueue] Debugging functions available:');
  console.log('  - global.listSyncQueue() - Prikaži sve iteme u queue-u');
  console.log('  - global.clearFailedSyncItems() - Obriši failed iteme');
  console.log('  - global.clearAllSyncItems() - Obriši SVE iteme (pažljivo!)');
}
