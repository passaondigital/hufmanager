import { ACTIVE_FLAVOR } from "@/config/appFlavor";

/**
 * First-Touch-Attribution: erfasst beim ERSTEN Besuch, aus welcher App
 * (HufManager/Hufi) ein Besucher kommt, über welche Kampagne (UTM),
 * von welchem Referrer und auf welcher Landing-Page er eingestiegen ist.
 *
 * Die Daten werden in localStorage gemerkt (überleben Navigation bis zum
 * Signup) und beim Registrieren als user_metadata an Supabase übergeben.
 * Der handle_new_user-Trigger schreibt sie dann nach public.profiles.
 */

const STORAGE_KEY = "huf_attribution";

export interface Attribution {
  signup_app: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  signup_referrer: string | null;
  landing_path: string | null;
}

/**
 * Einmal beim App-Start aufrufen. Speichert die Attribution nur, wenn noch
 * keine existiert (First-Touch — die ursprüngliche Herkunft gewinnt).
 */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // First-Touch: nicht überschreiben

    const params = new URLSearchParams(window.location.search);
    const clean = (v: string | null) => (v && v.trim() !== "" ? v.trim() : null);

    // Referrer nur speichern, wenn er von EXTERN kommt (nicht die eigene Domain)
    let referrer: string | null = null;
    if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        if (refHost && refHost !== window.location.hostname) {
          referrer = document.referrer;
        }
      } catch {
        referrer = document.referrer;
      }
    }

    const data: Attribution = {
      signup_app: ACTIVE_FLAVOR,
      utm_source: clean(params.get("utm_source")),
      utm_medium: clean(params.get("utm_medium")),
      utm_campaign: clean(params.get("utm_campaign")),
      utm_content: clean(params.get("utm_content")),
      utm_term: clean(params.get("utm_term")),
      signup_referrer: referrer,
      landing_path: window.location.pathname + window.location.search,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage nicht verfügbar (Private Mode o.ä.) — Attribution ist optional
  }
}

/**
 * Liefert die erfasste Attribution als flaches Objekt für user_metadata.
 * Fällt auf den aktuellen App-Flavor zurück, falls nichts gespeichert wurde.
 */
export function getAttribution(): Attribution {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch {
    // ignore
  }
  return {
    signup_app: ACTIVE_FLAVOR,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    signup_referrer: null,
    landing_path: null,
  };
}
