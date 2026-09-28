// HufManager hält die Supabase-Session pro Browser-Tab (sessionStorage). supabase-js leitet aus dem
// storageKey aber auch den Web-Lock (`lock:<storageKey>`) und den BroadcastChannel ab – beide gelten für
// die ganze Origin, also für ALLE Tabs. Folge (PROD-Befund 28.09.2026):
//   * hält ein anderer app.hufmanager.de-Tab den Auth-Lock (z. B. von Android eingefroren mitten im
//     Token-Refresh), wartet getSession() und damit jedes functions.invoke() ohne Timeout – kein Request;
//   * ein Login in Tab B wird per Broadcast in Tab A gemeldet, obwohl Tab A seine eigene Session behält
//     (UI-Nutzer ≠ Token-Nutzer).
// Ein Tab-eigener storageKey macht Lock und Broadcast so tab-lokal wie die Session selbst.

export const AUTH_TAB_ID_KEY = "hm-auth-tab-id";

export function projectRefFromUrl(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

function newTabId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().replace(/-/g, "").slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

/**
 * Liefert `sb-<ref>-tab-<id>-auth-token` (Muster `sb-…-auth-token` bleibt für bestehende Aufräum-Logik gültig).
 * Eine vorhandene Session unter dem bisherigen gemeinsamen Schlüssel wird einmalig in den Tab-Schlüssel
 * übernommen, damit laufende Sitzungen nach dem Deploy nicht abgemeldet werden.
 */
export function tabScopedAuthStorageKey(storage: Storage, supabaseUrl: string): string {
  const ref = projectRefFromUrl(supabaseUrl);
  let tabId = storage.getItem(AUTH_TAB_ID_KEY);
  if (!tabId) {
    tabId = newTabId();
    storage.setItem(AUTH_TAB_ID_KEY, tabId);
  }
  const key = `sb-${ref}-tab-${tabId}-auth-token`;
  const legacyKey = `sb-${ref}-auth-token`;
  const legacy = storage.getItem(legacyKey);
  if (legacy !== null) {
    if (storage.getItem(key) === null) storage.setItem(key, legacy);
    storage.removeItem(legacyKey);
  }
  return key;
}
