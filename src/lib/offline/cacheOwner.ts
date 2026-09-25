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

// Letzter Besitzer der lokalen Daten, dauerhaft gemerkt: nach einem neuen
// App-Einstieg (Tokens gelöscht, kein Logout) muss der nächste Login wissen,
// wem Query-Cache, Offline-Queues und lokale Notizen gehören.
const OWNER_MARKER_KEY = "hm_data_owner_v1";

/** Unverschlüsselte, nutzerbezogene localStorage-Stores ohne uid im Schlüssel. */
export const USER_SCOPED_LOCAL_KEYS = ["hm-employee-notebook", "huf_work_tracking_session"] as const;

function readMarker(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(OWNER_MARKER_KEY) : null;
  } catch {
    return null;
  }
}

export function getCacheOwner(): string | null {
  return cacheOwner ?? readMarker();
}

export function setCacheOwner(userId: string | null): void {
  cacheOwner = userId;
  if (!userId) return; // Marker bleibt: letzter bekannter Besitzer
  try {
    window.localStorage.setItem(OWNER_MARKER_KEY, userId);
  } catch {
    // ignore
  }
}

/** Entfernt nutzerbezogene localStorage-Daten (Query-Cache/IndexedDB räumt der Aufrufer). */
export function clearUserScopedLocalData(): void {
  try {
    for (const key of USER_SCOPED_LOCAL_KEYS) window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Offline-Queues nur abspielen, wenn die Session dem Besitzer der lokalen Daten gehört. */
export function sessionOwnsLocalData(): boolean {
  const uid = readSessionUserId();
  return !!uid && uid === getCacheOwner();
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
