import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, pendingActions, lastSyncDate } = useOfflineStatus();

  // Don't show anything if online and no pending actions
  if (isOnline && pendingActions === 0) {
    return null;
  }

  const formattedDate = lastSyncDate
    ? format(new Date(lastSyncDate), "dd.MM. HH:mm", { locale: de })
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        isOnline
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "bg-destructive/20 text-destructive border border-destructive/30",
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline-Modus</span>
          {formattedDate && (
            <span className="opacity-70">• Daten vom {formattedDate}</span>
          )}
        </>
      ) : pendingActions > 0 ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>{pendingActions} ausstehend</span>
        </>
      ) : null}
    </div>
  );
}
