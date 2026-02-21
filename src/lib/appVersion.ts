/**
 * App Version Control
 * 
 * WICHTIG: Diese Version bei jedem Deployment manuell hochzählen!
 * Format: MAJOR.MINOR.PATCH (z.B. 1.0.5)
 */
export const CURRENT_APP_VERSION = '1.1.0';

/**
 * Clears all caches and forces a hard reload
 * This is the nuclear option for cache busting
 */
export async function forceHardReload(): Promise<void> {
  console.log('[VersionControl] Starting hard reload...');
  
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`[VersionControl] Found ${registrations.length} service workers`);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[VersionControl] Unregistered service worker:', registration.scope);
      }
    }
    
    // 2. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`[VersionControl] Found ${cacheNames.length} caches`);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('[VersionControl] Deleted cache:', cacheName);
      }
    }
    
    // 3. Clear localStorage PWA dismiss flag to show install prompt again
    localStorage.removeItem('pwa-install-dismissed');
    
    // 4. Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5. Force reload - bypass cache completely
    // Using cache-busting query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('_reload', Date.now().toString());
    
    // Navigate to the new URL which forces a complete reload
    window.location.href = url.toString();
    
  } catch (error) {
    console.error('[VersionControl] Error during hard reload:', error);
    // Fallback: simple reload
    window.location.reload();
  }
}

/**
 * Compare semantic versions
 * Returns: 
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}
