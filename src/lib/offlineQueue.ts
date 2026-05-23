/**
 * offlineQueue.ts
 * ────────────────
 * IndexedDB-based persistent queue for orders created while offline.
 * Syncs to Firestore when network is restored.
 */

import { Order } from '@/types/kiosk';

export interface QueuedOrder {
  id: string;
  branchId: string;
  order: Omit<Order, 'id'>;
  createdAt: number; // timestamp
  syncAttempts: number;
}

const DB_NAME = 'aresto-offline';
const STORE_NAME = 'orders-queue';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection.
 */
export async function initializeOfflineDb(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const currentDb = (event.target as IDBOpenDBRequest).result;
      if (!currentDb.objectStoreNames.contains(STORE_NAME)) {
        currentDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save an order to offline queue (when network is down).
 */
export async function queueOrderOffline(
  branchId: string,
  order: Omit<Order, 'id'>,
): Promise<string> {
  const database = await initializeOfflineDb();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const queuedOrder: QueuedOrder = {
    id,
    branchId,
    order,
    createdAt: Date.now(),
    syncAttempts: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(queuedOrder);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(id);
  });
}

/**
 * Get all queued orders for a branch.
 */
export async function getQueuedOrders(branchId: string): Promise<QueuedOrder[]> {
  const database = await initializeOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = request.result as QueuedOrder[];
      resolve(all.filter(q => q.branchId === branchId));
    };
  });
}

/**
 * Remove a queued order after successful sync.
 */
export async function removeQueuedOrder(id: string): Promise<void> {
  const database = await initializeOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update sync attempt count for a queued order.
 */
export async function incrementSyncAttempt(id: string): Promise<void> {
  const database = await initializeOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result as QueuedOrder | undefined;
      if (record) {
        record.syncAttempts += 1;
        const updateRequest = store.put(record);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      } else {
        reject(new Error(`Order ${id} not found`));
      }
    };
  });
}

/**
 * Clear all queued orders (use with caution).
 */
export async function clearOfflineQueue(): Promise<void> {
  const database = await initializeOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get offline queue stats.
 */
export async function getOfflineQueueStats(branchId: string): Promise<{
  total: number;
  failedSyncs: QueuedOrder[];
}> {
  const queued = await getQueuedOrders(branchId);
  const failedSyncs = queued.filter(q => q.syncAttempts > 0);

  return {
    total: queued.length,
    failedSyncs,
  };
}
