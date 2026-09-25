/**
 * Mandanten-Schutz für den persistierten Query-Cache (P0 25.09.2026).
 *
 * Der TanStack-Query-Cache wird in IndexedDB gespeichert und beim App-Start
 * wiederhergestellt. Ohne Besitzer-Bindung sah ein anderer Nutzer im selben
 * Browser nach erneutem App-Einstieg (ohne Logout) Daten des vorherigen Nutzers.
 *
 * Regel: Der Cache gehört genau einer auth.uid(). Wiederhergestellt wird nur,
 * wenn die aktuelle Session derselben uid gehört; bei jedem Wechsel der uid
 * (inkl. Logout) wird der Cache vollständig verworfen.
 */

let cacheOwner: string | null = null;

export function getCacheOwner(): string | null {
  return cacheOwner;
}

export function setCacheOwner(userId: string | null): void {
  cacheOwner = userId;
}

function userIdFromStorage(storage: Storage | undefined): string | null {
  if (!storage) return null;
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const id = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
      if (typeof id === "string" && id) return id;
    }
  } catch {
    // ignore
  }
  return null;
}

/** uid der aktuell gespeicherten Supabase-Session (synchron, ohne Netzwerk). */
export function readSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  let session: Storage | undefined;
  let local: Storage | undefined;
  try { session = window.sessionStorage; } catch { session = undefined; }
  try { local = window.localStorage; } catch { local = undefined; }
  return userIdFromStorage(session) ?? userIdFromStorage(local);
}
