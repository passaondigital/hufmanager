import { useState, useEffect } from "react";
import { Wifi, WifiOff, CloudOff, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSyncQueue } from "@/lib/offline/syncQueue";
import { getOfflineImageCount } from "@/lib/offline/imageQueue";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ConnectionState = "online" | "syncing" | "offline";

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = false }: ConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateState = async () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setState("offline");
        return;
      }

      // Check for pending sync items
      const [syncQueue, imageCount] = await Promise.all([
        getSyncQueue(),
        getOfflineImageCount(),
      ]);
      
      const totalPending = syncQueue.length + imageCount;
      setPendingCount(totalPending);

      if (totalPending > 0) {
        setState("syncing");
      } else {
        setState("online");
      }
    };

    // Initial check
    updateState();

    // Listen for online/offline events
    const handleOnline = () => updateState();
    const handleOffline = () => {
      setIsOnline(false);
      setState("offline");
    };

    // Listen for sync queue updates
    const handleSyncUpdate = () => updateState();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("syncQueueUpdated", handleSyncUpdate);
    window.addEventListener("offlineImagesUpdated", handleSyncUpdate);

    // Periodic check every 10 seconds
    const interval = setInterval(updateState, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("syncQueueUpdated", handleSyncUpdate);
      window.removeEventListener("offlineImagesUpdated", handleSyncUpdate);
      clearInterval(interval);
    };
  }, []);

  const getStatusConfig = () => {
    switch (state) {
      case "online":
        return {
          icon: Check,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          label: "Synchronisiert",
          description: "Alle Daten sind aktuell",
        };
      case "syncing":
        return {
          icon: RefreshCw,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          label: `Sync (${pendingCount})`,
          description: `${pendingCount} Änderung${pendingCount > 1 ? "en" : ""} wird synchronisiert`,
          animate: true,
        };
      case "offline":
        return {
          icon: CloudOff,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted-foreground/30",
          label: "Offline",
          description: "Änderungen werden lokal gespeichert",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Don't show anything if fully online and synced (clean state)
  if (state === "online" && !showLabel) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all cursor-default",
            config.bgColor,
            config.borderColor,
            "border",
            className
          )}
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              config.color,
              config.animate && "animate-spin"
            )}
          />
          {showLabel && (
            <span className={config.color}>{config.label}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
