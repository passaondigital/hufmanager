import { get, set } from "idb-keyval";

const SYNC_QUEUE_KEY = "hufmanager-sync-queue";

export interface SyncAction {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

/**
 * Get all pending sync actions from IndexedDB
 */
export async function getSyncQueue(): Promise<SyncAction[]> {
  try {
    const queue = await get<SyncAction[]>(SYNC_QUEUE_KEY);
    return queue || [];
  } catch (error) {
    console.error("Failed to get sync queue:", error);
    return [];
  }
}

/**
 * Add an action to the sync queue
 */
export async function addToSyncQueue(action: Omit<SyncAction, "id" | "createdAt" | "retryCount">): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const newAction: SyncAction = {
      ...action,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    await set(SYNC_QUEUE_KEY, [...queue, newAction]);
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent("syncQueueUpdated", { detail: { count: queue.length + 1 } }));
  } catch (error) {
    console.error("Failed to add to sync queue:", error);
  }
}

/**
 * Remove a successfully synced action from the queue
 */
export async function removeFromSyncQueue(actionId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const newQueue = queue.filter((action) => action.id !== actionId);
    await set(SYNC_QUEUE_KEY, newQueue);
    
    window.dispatchEvent(new CustomEvent("syncQueueUpdated", { detail: { count: newQueue.length } }));
  } catch (error) {
    console.error("Failed to remove from sync queue:", error);
  }
}

/**
 * Update retry count for a failed sync action
 */
export async function updateSyncActionRetry(actionId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const newQueue = queue.map((action) =>
      action.id === actionId ? { ...action, retryCount: action.retryCount + 1 } : action
    );
    await set(SYNC_QUEUE_KEY, newQueue);
  } catch (error) {
    console.error("Failed to update sync action retry:", error);
  }
}

/**
 * Clear all sync queue items
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    await set(SYNC_QUEUE_KEY, []);
    window.dispatchEvent(new CustomEvent("syncQueueUpdated", { detail: { count: 0 } }));
  } catch (error) {
    console.error("Failed to clear sync queue:", error);
  }
}
