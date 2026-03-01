import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSyncQueue } from "@/lib/offline/syncQueue";
import { getOfflineImageCount } from "@/lib/offline/imageQueue";
import { processSyncQueue } from "@/lib/offline/syncManager";
import { Button } from "@/components/ui/button";

/**
 * Persistent offline banner shown below the header when offline
 * or when there are pending sync items.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = async () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      const [queue, images] = await Promise.all([
        getSyncQueue(),
        getOfflineImageCount(),
      ]);
      setPendingCount(queue.length + images);
      
      // Reset dismissed when going offline
      if (!online) setDismissed(false);
    };

    update();

    const onOnline = () => { update(); setDismissed(false); };
    const onOffline = () => { setIsOnline(false); setDismissed(false); };
    const onSync = () => update();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("syncQueueUpdated", onSync);
    window.addEventListener("offlineImagesUpdated", onSync);

    const interval = setInterval(update, 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("syncQueueUpdated", onSync);
      window.removeEventListener("offlineImagesUpdated", onSync);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await processSyncQueue();
    } finally {
      setSyncing(false);
    }
  };

  // Show nothing if online with no pending items
  if (isOnline && pendingCount === 0) return null;
  if (dismissed && isOnline) return null;

  return (
    <div
      className={cn(
        "lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
        !isOnline
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-500/20"
      )}
    >
      {!isOnline ? (
        <WifiOff className="h-4 w-4 shrink-0" />
      ) : (
        <RefreshCw className={cn("h-4 w-4 shrink-0", syncing && "animate-spin")} />
      )}
      
      <span className="flex-1 text-xs">
        {!isOnline
          ? "Du arbeitest offline. Daten werden synchronisiert sobald du wieder Netz hast."
          : `${pendingCount} Änderung${pendingCount !== 1 ? "en" : ""} wird synchronisiert...`}
      </span>

      {isOnline && pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
          className="h-7 px-2 text-xs shrink-0"
        >
          {syncing ? "Sync..." : "Jetzt"}
        </Button>
      )}

      {isOnline && (
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-accent/20 shrink-0"
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
