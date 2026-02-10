import { supabase } from "@/integrations/supabase/client";
import { getSyncQueue, removeFromSyncQueue, updateSyncActionRetry, SyncAction } from "./syncQueue";
import { processOfflineImages } from "./imageSyncManager";
import { MAX_SYNC_RETRIES } from "./offlineConfig";
import { toast } from "sonner";

/**
 * Process a single sync action
 */
async function processSyncAction(action: SyncAction): Promise<boolean> {
  try {
    const { type, table, data } = action;
    
    // Type-safe table access – must stay in sync with OFFLINE_MUTATION_TABLES
    const validTables = [
      "appointments", "horses", "contacts", "hoof_photos", 
      "horse_documents", "invoices", "leads", "messages",
      "hoof_analyses", "vehicle_mileage_logs"
    ] as const;
    
    if (!validTables.includes(table as any)) {
      console.error(`Invalid table: ${table}`);
      return false;
    }

    let result;
    
    switch (type) {
      case "create":
        result = await (supabase.from(table as any) as any).insert(data);
        break;
      case "update":
        if (!data.id) {
          console.error("Update action missing ID");
          return false;
        }
        result = await (supabase.from(table as any) as any)
          .update(data)
          .eq("id", data.id);
        break;
      case "delete":
        if (!data.id) {
          console.error("Delete action missing ID");
          return false;
        }
        result = await (supabase.from(table as any) as any)
          .delete()
          .eq("id", data.id);
        break;
      default:
        console.error(`Unknown action type: ${type}`);
        return false;
    }

    if (result.error) {
      console.error("Sync action failed:", result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error processing sync action:", error);
    return false;
  }
}

/**
 * Process all pending sync actions
 */
export async function processSyncQueue(): Promise<void> {
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return;
  }

  console.log(`Processing ${queue.length} pending sync actions...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const action of queue) {
    if (action.retryCount >= MAX_SYNC_RETRIES) {
      console.warn(`Skipping action ${action.id} - max retries exceeded`);
      failCount++;
      continue;
    }

    const success = await processSyncAction(action);
    
    if (success) {
      await removeFromSyncQueue(action.id);
      successCount++;
    } else {
      await updateSyncActionRetry(action.id);
      failCount++;
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} Änderung${successCount > 1 ? "en" : ""} synchronisiert`);
  }
  
  if (failCount > 0) {
    toast.error(`${failCount} Änderung${failCount > 1 ? "en" : ""} konnten nicht synchronisiert werden`);
  }
}

/**
 * Initialize online/offline event listeners
 */
export function initSyncManager(): () => void {
  const handleOnline = () => {
    console.log("App is online - processing sync queue...");
    toast.info("Verbindung wiederhergestellt - synchronisiere Daten...");
    processSyncQueue();
  };

  const handleOffline = () => {
    console.log("App is offline - changes will be queued");
    toast.warning("Offline-Modus aktiv - Änderungen werden lokal gespeichert");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Process queue on initial load if online
  if (navigator.onLine) {
    processSyncQueue();
  }

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
