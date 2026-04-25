/**
 * Detects if the app is running on a portal subdomain or the main app.
 * Subdomains: portal.hufiapp.de, versicherung.hufiapp.de, markt.hufiapp.de, tierarzt.hufiapp.de
 */
export type PortalMode = 'app' | 'portal' | 'insurance' | 'marketplace' | 'veterinary';

export interface PortalDetection {
  mode: PortalMode;
  orgSlug: string | null;
}

export function detectPortalMode(): PortalDetection {
  const hostname = window.location.hostname;

  // Subdomain detection
  if (hostname.startsWith('portal.')) return { mode: 'portal', orgSlug: null };
  if (hostname.startsWith('versicherung.')) return { mode: 'insurance', orgSlug: null };
  if (hostname.startsWith('markt.')) return { mode: 'marketplace', orgSlug: null };
  if (hostname.startsWith('tierarzt.')) return { mode: 'veterinary', orgSlug: null };

  // Path-based fallback: /portal/:slug
  // Exclude reserved portal paths that have their own routes
  const RESERVED_PORTAL_PATHS = new Set([
    'galerie', 'bewerben', 'versicherung', 'hersteller',
    'tierarzt', 'lieferant', 'ausbildung', 'verband',
  ]);
  const match = window.location.pathname.match(/^\/portal\/([^/]+)/);
  if (match && !RESERVED_PORTAL_PATHS.has(match[1])) {
    return { mode: 'portal', orgSlug: match[1] };
  }

  return { mode: 'app', orgSlug: null };
}

export function usePortalDetection(): PortalDetection {
  // Stable – hostname doesn't change during session
  return detectPortalMode();
}
