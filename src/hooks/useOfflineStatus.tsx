import { useState, useEffect } from "react";
import { getSyncQueue, SyncAction } from "@/lib/offline/syncQueue";

interface OfflineStatus {
  isOnline: boolean;
  pendingActions: number;
  lastSyncDate: string | null;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncQueueUpdated = (event: CustomEvent<{ count: number }>) => {
      setPendingActions(event.detail.count);
      if (event.detail.count === 0) {
        setLastSyncDate(new Date().toISOString());
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("syncQueueUpdated", handleSyncQueueUpdated as EventListener);

    // Initialize pending actions count
    getSyncQueue().then((queue) => {
      setPendingActions(queue.length);
    });

    // Get last cache date from localStorage
    const cachedDate = localStorage.getItem("hufmanager-last-sync");
    if (cachedDate) {
      setLastSyncDate(cachedDate);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("syncQueueUpdated", handleSyncQueueUpdated as EventListener);
    };
  }, []);

  // Update last sync date in localStorage when online
  useEffect(() => {
    if (isOnline && pendingActions === 0) {
      const now = new Date().toISOString();
      localStorage.setItem("hufmanager-last-sync", now);
      setLastSyncDate(now);
    }
  }, [isOnline, pendingActions]);

  return { isOnline, pendingActions, lastSyncDate };
}
