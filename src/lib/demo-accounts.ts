/**
 * Zentrale Demo-Account-Konfiguration
 * Alle Demo-E-Mail-Adressen und Hilfsfunktionen
 */

export const DEMO_EMAILS = {
  provider: "hufbearbeiter.hufmanager@gmail.com",
  client: "pferdebesitzer.hufmanager@gmail.com",
  employee: "mitarbeiter.hufmanager@gmail.com",
  partner: "partner.hufmanager@gmail.com",
  business: "hufmanagerbusiness@gmail.com",
  stallbetreiber: "hufmanagerstallbetreiber@gmail.com",
} as const;

/** Alle Demo-E-Mails als Set für schnelle Lookups */
const DEMO_EMAIL_SET = new Set<string>(Object.values(DEMO_EMAILS));

/** Prüft ob eine E-Mail zu einem Demo-Account gehört */
export function isDemoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (DEMO_EMAIL_SET.has(lower)) return true;
  // Also exclude test/demo patterns and internal domain
  if (lower.includes("demo") || lower.includes("test@") || lower.endsWith("@hufiapp.de")) return true;
  return false;
}

/** Prüft ob eine E-Mail der Provider-Demo-Account ist */
export function isProviderDemoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_EMAILS.provider;
}
