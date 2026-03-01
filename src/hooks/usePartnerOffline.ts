import { useState, useEffect, useCallback } from "react";
import { addToSyncQueue, getSyncQueue } from "@/lib/offline/syncQueue";
import { toast } from "sonner";

/**
 * Partner-specific offline hook.
 * Reuses the existing offline infrastructure (IndexedDB sync queue).
 * Partner-writable tables: partner_treatment_notes, partner_appointments, partner_invoices
 */
export function usePartnerOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast.info("Verbindung wiederhergestellt — synchronisiere...");
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.warning("Offline-Modus aktiv");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Check pending on mount
    getSyncQueue().then(q => setPendingCount(q.length));

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const queueMutation = useCallback(async (
    type: "create" | "update" | "delete",
    table: string,
    data: Record<string, any>
  ) => {
    await addToSyncQueue({
      type,
      table: table as any,
      data,
    });
    const q = await getSyncQueue();
    setPendingCount(q.length);
  }, []);

  return { isOnline, pendingCount, queueMutation };
}
