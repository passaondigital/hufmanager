const TILE_CACHE_NAME = 'hufmanager-tiles-v1';
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Calculate the bounding box for an array of [lat, lng] positions
 * with a padding factor to include surrounding area.
 */
function getBoundingBox(positions: [number, number][], paddingKm = 2) {
  const lats = positions.map(p => p[0]);
  const lngs = positions.map(p => p[1]);
  
  // ~0.009 degrees per km at mid-European latitudes
  const padding = paddingKm * 0.009;
  
  return {
    minLat: Math.min(...lats) - padding,
    maxLat: Math.max(...lats) + padding,
    minLng: Math.min(...lngs) - padding,
    maxLng: Math.max(...lngs) + padding,
  };
}

/**
 * Convert lat/lng to tile x/y at a given zoom level.
 */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Get all tile URLs needed for a bounding box at given zoom levels.
 */
function getTileUrls(
  bbox: ReturnType<typeof getBoundingBox>,
  zoomLevels: number[]
): string[] {
  const urls: string[] = [];

  for (const z of zoomLevels) {
    const topLeft = latLngToTile(bbox.maxLat, bbox.minLng, z);
    const bottomRight = latLngToTile(bbox.minLat, bbox.maxLng, z);

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        urls.push(
          TILE_URL_TEMPLATE
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y))
        );
      }
    }
  }

  return urls;
}

/**
 * Prefetch tiles for a tour route into the Cache API.
 * Called when a tour starts with the route positions.
 * Zoom levels 10-16 as specified.
 */
export async function prefetchTilesForRoute(
  positions: [number, number][],
  onProgress?: (loaded: number, total: number) => void
): Promise<{ cached: number; total: number }> {
  if (!('caches' in window) || positions.length < 2) {
    return { cached: 0, total: 0 };
  }

  const bbox = getBoundingBox(positions);
  const zoomLevels = [10, 11, 12, 13, 14, 15, 16];
  const urls = getTileUrls(bbox, zoomLevels);

  // Safety limit: don't cache more than 2000 tiles
  const limitedUrls = urls.slice(0, 2000);
  
  console.log(`[TileCache] Prefetching ${limitedUrls.length} tiles for route (${urls.length} total calculated)`);

  const cache = await caches.open(TILE_CACHE_NAME);
  let cached = 0;

  // Fetch in batches of 10 to avoid overwhelming the network
  const batchSize = 10;
  for (let i = 0; i < limitedUrls.length; i += batchSize) {
    const batch = limitedUrls.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        // Check if already cached
        const existing = await cache.match(url);
        if (existing) return;

        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      })
    );

    cached += results.filter(r => r.status === 'fulfilled').length;
    onProgress?.(Math.min(i + batchSize, limitedUrls.length), limitedUrls.length);
  }

  console.log(`[TileCache] Cached ${cached} new tiles`);
  return { cached, total: limitedUrls.length };
}

/**
 * Clear the tile cache (e.g., when tour ends).
 */
export async function clearTileCache(): Promise<void> {
  if ('caches' in window) {
    await caches.delete(TILE_CACHE_NAME);
    console.log('[TileCache] Tile cache cleared');
  }
}
