/**
 * Registrierungsdaten, die erst nach dem ersten Login verarbeitet werden
 * (Widerrufs-Consent, Berufstyp, Anrede, Kundentyp, Invite-Code).
 *
 * Sie liegen in sessionStorage und gehen verloren, wenn der Bestätigungslink
 * aus der E-Mail einen neuen Tab öffnet. Deshalb zusätzlich eine Kopie in
 * localStorage — an die registrierte E-Mail gebunden und zeitlich begrenzt,
 * damit auf geteilten Geräten kein anderer Nutzer sie übernimmt.
 */

const STORAGE_KEY = "hm_pending_signup_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const PENDING_SIGNUP_KEYS = [
  "huf_invite_code",
  "hm_pending_client_type",
  "hm_pending_profession_type",
  "hm_pending_salutation",
  "hm_pending_widerruf_consent",
] as const;

interface PendingSignupBundle {
  email: string;
  savedAt: number;
  values: Record<string, string>;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Nach erfolgreichem signUp: aktuelle sessionStorage-Werte sichern. */
export function savePendingSignup(email: string): void {
  try {
    const values: Record<string, string> = {};
    for (const key of PENDING_SIGNUP_KEYS) {
      const value = sessionStorage.getItem(key);
      if (value) values[key] = value;
    }
    if (Object.keys(values).length === 0) return;
    const bundle: PendingSignupBundle = { email: normalizeEmail(email), savedAt: Date.now(), values };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // Storage nicht verfügbar — gleicher Tab funktioniert weiterhin über sessionStorage.
  }
}

/**
 * Beim Login: gesicherte Werte in sessionStorage zurückspielen, aber nur für
 * dieselbe E-Mail und nur innerhalb von 7 Tagen. Vorhandene sessionStorage-Werte
 * haben Vorrang. Die Kopie wird danach immer entfernt, außer sie gehört zu einer
 * anderen E-Mail und ist noch gültig.
 */
export function restorePendingSignup(email: string | null | undefined): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let bundle: PendingSignupBundle | null = null;
    try {
      bundle = JSON.parse(raw) as PendingSignupBundle;
    } catch {
      bundle = null;
    }
    const expired = !bundle || typeof bundle.savedAt !== "number" || Date.now() - bundle.savedAt > MAX_AGE_MS;
    if (expired) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!email || bundle!.email !== normalizeEmail(email)) return;
    for (const key of PENDING_SIGNUP_KEYS) {
      const value = bundle!.values?.[key];
      if (typeof value === "string" && value && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, value);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
