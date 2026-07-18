// Single Source of Truth dafür, welche unfertigen Bereiche der App sichtbar sind.
// Nav, Router-Guards und Menü-Kacheln lesen NUR aus diesem Objekt — kein verstreutes
// Auskommentieren einzelner Links. Siehe HUFI_ROADMAP.md "Store-Fahrplan Schritt 2".
//
// Regel: alles was hier auf false steht, ist per appMap.ts als "attrappe" oder
// "teilweise mit irreführenden Mock-Daten" eingestuft und wartet auf Fertigstellung.
// Erst wenn ein Bereich wirklich fertig ist: Flag auf true UND appMap.ts reife
// entsprechend auf "live" aktualisieren.

export interface FeatureFlag {
  enabled: boolean;
  beschreibung: string;
}

export const FEATURE_FLAGS = {
  // Weißmarkierte Portal-Produkte für Versicherung/Tierarzt/Hersteller/Ausbildung/
  // Verband/Lieferant (/portal/:slug/*). Nur über feste Demo-E-Mail erreichbar,
  // ~20 Module mit hartcodierten DEMO_*-Arrays statt echten Daten.
  portalWhiteLabel: {
    enabled: false,
    beschreibung: "Portal-Whitelabel-Produkt (Versicherung/Tierarzt/Hersteller/Ausbildung/Verband/Lieferant) — hinter Feature-Flag verborgen bis fertig",
  },
  // Komplettes Botschafter-Dashboard (src/pages/botschafter/*) — nicht zu
  // verwechseln mit /botschafter/login, /botschafter/warten, /ref/:code (live).
  botschafterDashboard: {
    enabled: false,
    beschreibung: "Botschafter-Dashboard-Rolle — hinter Feature-Flag verborgen bis fertig",
  },
  // Komplette Stallbetreiber-Rolle (src/pages/stallbetreiber/*) inkl. der
  // zugehörigen Client-seitigen Business-/Stallverwaltungs-Seiten.
  stallbetreiberRolle: {
    enabled: false,
    beschreibung: "Stallbetreiber-Rolle inkl. Client-Business-/Stallverwaltung — hinter Feature-Flag verborgen bis fertig",
  },
  // Partner-Management-Untermenüs, die auf nicht registrierte Routen zeigen
  // (Öffentliches Profil, Kommunikation, Rechtliches, Botschafter werden).
  partnerManagementExtras: {
    enabled: false,
    beschreibung: "Partner-Management Öffentliches Profil/Kommunikation/Rechtliches/Botschafter — hinter Feature-Flag verborgen bis fertig",
  },
  // Öffentliche Pferdemarkt-Browse-Ansicht (/client-marketplace): zeigt
  // "Coming Soon"-Badge und hartcodierte DEMO_LISTINGS statt echter Daten.
  // /client-marketplace/create und /client-marketplace/mine sind live und
  // bleiben über diesen Flag unberührt erreichbar.
  clientMarketplaceBrowse: {
    enabled: false,
    beschreibung: "Pferdemarkt-Browse-Ansicht (Demo-Modus) — hinter Feature-Flag verborgen bis fertig",
  },
  // Wake-Word-Aktivierung ("Hey Hufi") via webkitSpeechRecognition. Temporär
  // deaktiviert: kollidiert auf Chrome/Android/ChromeOS mit dem MediaRecorder-
  // Mikrofonzugriff der eigentlichen Sprachaufnahme (kein zentrales
  // Mic-Arbitrierung — siehe HUFI_TODO.md "useMicArbiter"). Tippen und der
  // manuelle Mic-Button (useVoiceCapture) sind NICHT betroffen und bleiben
  // voll funktionsfähig. Consent-Infrastruktur (KiSettingsCard, localStorage)
  // bleibt erhalten für die spätere Reaktivierung.
  wakeWordEnabled: {
    enabled: false,
    beschreibung: "Hey-Hufi-Wake-Word — temporär hinter Feature-Flag deaktiviert (Mikrofon-Kollision mit Sprachaufnahme), Tippen/Mic-Button unberührt",
  },
} as const satisfies Record<string, FeatureFlag>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[key].enabled;
}
