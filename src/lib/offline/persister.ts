import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { getCacheOwner, readSessionUserId, setCacheOwner } from "@/lib/offline/cacheOwner";

const IDB_KEY = "hufmanager-query-cache";

interface OwnedPersistedClient {
  owner: string;
  client: PersistedClient;
}

/**
 * Creates an IndexedDB persister for TanStack Query
 * Uses idb-keyval for simple key-value storage.
 *
 * Der Cache ist an die auth.uid() gebunden (siehe cacheOwner.ts): ohne Session
 * wird nichts gespeichert, und wiederhergestellt wird nur für dieselbe uid.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const owner = readSessionUserId();
        if (!owner) {
          await del(IDB_KEY);
          return;
        }
        // Während eines Nutzerwechsels (Cache wird gerade geleert) nichts schreiben.
        if (getCacheOwner() !== null && getCacheOwner() !== owner) return;
        const entry: OwnedPersistedClient = { owner, client };
        await set(IDB_KEY, entry);
      } catch (error) {
        console.error("Failed to persist query client:", error);
      }
    },
    restoreClient: async () => {
      try {
        const stored = await get<OwnedPersistedClient | PersistedClient>(IDB_KEY);
        const owner = readSessionUserId();
        const storedOwner = stored && "owner" in stored ? stored.owner : null;
        if (!stored || !owner || storedOwner !== owner) {
          // Fremder, anonymer oder alter (unmarkierter) Cache: nie anzeigen.
          if (stored) await del(IDB_KEY);
          return undefined;
        }
        setCacheOwner(owner);
        return (stored as OwnedPersistedClient).client;
      } catch (error) {
        console.error("Failed to restore query client:", error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(IDB_KEY);
      } catch (error) {
        console.error("Failed to remove query client:", error);
      }
    },
  };
}
