import { useState, useEffect, useCallback } from "react";
import { getSyncQueue, SyncAction } from "@/lib/offline/syncQueue";
import { getOfflineImageCount } from "@/lib/offline/imageQueue";

export type SyncState = "idle" | "syncing" | "offline" | "error";

interface OfflineState {
  isOnline: boolean;
  syncState: SyncState;
  pendingMutations: number;
  pendingImages: number;
  totalPending: number;
  lastSyncDate: string | null;
}

export function useOfflineState(): OfflineState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingMutations, setPendingMutations] = useState(0);
  const [pendingImages, setPendingImages] = useState(0);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  const updatePendingCounts = useCallback(async () => {
    try {
      const [queue, imageCount] = await Promise.all([
        getSyncQueue(),
        getOfflineImageCount(),
      ]);
      
      setPendingMutations(queue.length);
      setPendingImages(imageCount);
      
      const totalPending = queue.length + imageCount;
      
      if (!navigator.onLine) {
        setSyncState("offline");
      } else if (totalPending > 0) {
        setSyncState("syncing");
      } else {
        setSyncState("idle");
        // Update last sync date
        const now = new Date().toISOString();
        localStorage.setItem("hufmanager-last-sync", now);
        setLastSyncDate(now);
      }
    } catch (error) {
      console.error("Failed to update pending counts:", error);
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    // Initial load
    updatePendingCounts();
    
    // Load last sync date from localStorage
    const cachedDate = localStorage.getItem("hufmanager-last-sync");
    if (cachedDate) {
      setLastSyncDate(cachedDate);
    }

    // Event handlers
    const handleOnline = () => {
      setIsOnline(true);
      updatePendingCounts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState("offline");
    };

    const handleSyncUpdate = (event: CustomEvent<{ count: number }>) => {
      setPendingMutations(event.detail.count);
      updatePendingCounts();
    };

    const handleImageUpdate = () => {
      updatePendingCounts();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("syncQueueUpdated", handleSyncUpdate as EventListener);
    window.addEventListener("offlineImagesUpdated", handleImageUpdate);

    // Periodic check
    const interval = setInterval(updatePendingCounts, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("syncQueueUpdated", handleSyncUpdate as EventListener);
      window.removeEventListener("offlineImagesUpdated", handleImageUpdate);
      clearInterval(interval);
    };
  }, [updatePendingCounts]);

  return {
    isOnline,
    syncState,
    pendingMutations,
    pendingImages,
    totalPending: pendingMutations + pendingImages,
    lastSyncDate,
  };
}
