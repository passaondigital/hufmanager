/**
 * Nominatim geocoding utility (DSGVO-compliant, EU servers)
 * Rate limit: max 1 req/sec per Nominatim usage policy
 */

interface GeocodingResult {
  lat: number;
  lng: number;
}

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise(resolve => setTimeout(resolve, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function geocodeAddress(
  street: string | null,
  zip: string | null,
  city: string | null
): Promise<GeocodingResult | null> {
  const parts = [street, zip, city].filter(Boolean);
  if (parts.length === 0) return null;

  const query = parts.join(", ");

  try {
    await throttle();

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "de,at,ch");

    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "de",
        "User-Agent": "Hufi/1.0",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}
