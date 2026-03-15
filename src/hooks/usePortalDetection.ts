/**
 * Detects if the app is running on a portal subdomain or the main app.
 * Subdomains: portal.hufmanager.de, versicherung.hufmanager.de, markt.hufmanager.de
 */
export type PortalMode = 'app' | 'portal' | 'insurance' | 'marketplace';

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

  // Path-based fallback: /portal/:slug
  const match = window.location.pathname.match(/^\/portal\/([^/]+)/);
  if (match) return { mode: 'portal', orgSlug: match[1] };

  return { mode: 'app', orgSlug: null };
}

export function usePortalDetection(): PortalDetection {
  // Stable – hostname doesn't change during session
  return detectPortalMode();
}
