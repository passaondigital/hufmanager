export type AppFlavor = 'hufmanager' | 'hufiapp';

interface FlavorConfig {
  appName: string;
  defaultTheme: 'light' | 'dark';
  hufiVoiceDefault: boolean;
  /** Marken-Logo mit Schriftzug (Pfad unter /public) */
  logo: string;
  /** Logo-Mark ohne Schriftzug für kompakte Stellen (z.B. eingeklappte Sidebar) */
  logoMark: string;
  /** Basis-URL für rechtliche Seiten (Impressum/Datenschutz/AGB) */
  legalBaseUrl: string;
  /** Support-/Kontakt-Mailadresse */
  supportEmail: string;
  /** Primäre Domain ohne Protokoll */
  domain: string;
}

const FLAVOR_CONFIGS: Record<AppFlavor, FlavorConfig> = {
  hufmanager: {
    appName: 'HufManager',
    defaultTheme: 'dark',
    hufiVoiceDefault: false,
    logo: '/hufmanager-logo.png',
    logoMark: '/hufmanager-logo.png',
    legalBaseUrl: 'https://hufmanager.de',
    supportEmail: 'support@hufmanager.de',
    domain: 'hufmanager.de',
  },
  hufiapp: {
    appName: 'Hufi',
    defaultTheme: 'light',
    hufiVoiceDefault: true,
    logo: '/hufi-logo.webp',
    logoMark: '/hufi-mark.webp',
    legalBaseUrl: 'https://hufiapp.de',
    supportEmail: 'support@hufiapp.de',
    domain: 'hufiapp.de',
  },
};

function detectFlavor(): AppFlavor {
  // Stufe 1: Hostname (primär — eine Domain, ein Flavor)
  const host = window.location.hostname;
  let detected: AppFlavor = 'hufmanager';
  if (host.includes('hufiapp')) detected = 'hufiapp';

  // Stufe 2: Env-Variable gewinnt als Override (lokaler/Spezialbetrieb)
  const env = import.meta.env.VITE_APP_FLAVOR;
  if (env === 'hufmanager' || env === 'hufiapp') return env;

  return detected;
}

export const ACTIVE_FLAVOR: AppFlavor = detectFlavor();
export const FLAVOR_CONFIG = FLAVOR_CONFIGS[ACTIVE_FLAVOR];
