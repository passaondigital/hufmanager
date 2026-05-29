// ── Types ─────────────────────────────────────────────────────────────────────

export interface RouteStop {
  id: string;
  horseName: string;
  clientName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  scheduledTime?: string;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  googleMapsUrl: string;
  optimized: boolean;
}

// ── Haversine distance ────────────────────────────────────────────────────────

function km(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Nearest-neighbor TSP approximation ───────────────────────────────────────

function nearestNeighborTSP(
  stops: RouteStop[],
  startLat: number,
  startLng: number,
): RouteStop[] {
  const remaining = [...stops];
  const ordered: RouteStop[] = [];
  let curLat = startLat;
  let curLng = startLng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i];
      if (s.lat === undefined || s.lng === undefined) {
        // Stops without geo maintain original order
        if (bestDist === Infinity) { bestIdx = i; bestDist = 0; }
        continue;
      }
      const d = km(curLat, curLng, s.lat, s.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    curLat = next.lat ?? curLat;
    curLng = next.lng ?? curLng;
  }

  return ordered;
}

// ── optimizeRoute ─────────────────────────────────────────────────────────────

export function optimizeRoute(
  stops: RouteStop[],
  startLocation?: { lat: number; lng: number },
): OptimizedRoute {
  if (stops.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      estimatedDurationMin: 0,
      googleMapsUrl: "https://maps.google.com",
      optimized: false,
    };
  }

  const hasGeo = stops.some((s) => s.lat !== undefined && s.lng !== undefined);
  let ordered = stops;
  let totalKm = 0;

  if (hasGeo && startLocation) {
    ordered = nearestNeighborTSP(stops, startLocation.lat, startLocation.lng);

    let curLat = startLocation.lat;
    let curLng = startLocation.lng;
    for (const s of ordered) {
      if (s.lat !== undefined && s.lng !== undefined) {
        totalKm += km(curLat, curLng, s.lat, s.lng);
        curLat = s.lat;
        curLng = s.lng;
      }
    }
  }

  // ~30 km/h average on farm roads + 45 min per stop
  const estimatedDurationMin = Math.round((totalKm / 30) * 60) + ordered.length * 45;

  // Build Google Maps URL
  const waypoints = ordered
    .map((s) => {
      if (s.lat !== undefined && s.lng !== undefined) return `${s.lat},${s.lng}`;
      if (s.address) return encodeURIComponent(s.address);
      return null;
    })
    .filter((w): w is string => w !== null);

  let googleMapsUrl: string;
  if (waypoints.length === 0) {
    googleMapsUrl = "https://maps.google.com";
  } else if (waypoints.length === 1) {
    googleMapsUrl = `https://maps.google.com/?q=${waypoints[0]}`;
  } else {
    const origin = startLocation
      ? `${startLocation.lat},${startLocation.lng}`
      : waypoints[0];
    const dest = waypoints[waypoints.length - 1];
    const mid = waypoints.slice(1, -1).join("|");
    const waypointsParam = mid ? `&waypoints=${mid}` : "";
    googleMapsUrl = `https://maps.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsParam}&travelmode=driving`;
  }

  return {
    stops: ordered,
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    estimatedDurationMin,
    googleMapsUrl,
    optimized: hasGeo && !!startLocation,
  };
}

// ── formatRouteMessage ────────────────────────────────────────────────────────

export function formatRouteMessage(route: OptimizedRoute): string {
  if (route.stops.length === 0) return "Keine Stops für die Route.";

  const lines = route.stops.map((s, i) => {
    const time = s.scheduledTime ? ` (${s.scheduledTime.slice(0, 5)})` : "";
    const who = s.clientName ? ` · ${s.clientName}` : "";
    return `${i + 1}. ${s.horseName}${who}${time}`;
  });

  const meta = route.optimized
    ? `📍 ~${route.totalDistanceKm} km · ~${route.estimatedDurationMin} Min.`
    : "📍 Reihenfolge nach Terminplan (kein GPS verfügbar)";

  return `🗺️ Deine optimierte Route:\n\n${lines.join("\n")}\n\n${meta}`;
}

// ── Additional helpers ────────────────────────────────────────────────────────

export function buildGoogleMapsRouteLink(addresses: string[]): string {
  if (addresses.length === 0) return "https://maps.google.com";
  const parts = addresses.map((a) => encodeURIComponent(a));
  return `https://www.google.com/maps/dir/${parts.join("/")}`;
}

export function formatRouteKm(totalMinutes: number): string {
  // Grobe Schätzung: 1 km ≈ 1.5 min ländlich
  const km = Math.round(totalMinutes / 1.5);
  return `ca. ${km} km`;
}

export function buildRouteSummary(
  stops: Array<{ name: string; address?: string }>,
  estimatedKm?: number
): string {
  if (stops.length === 0) return "Keine Stopps geplant.";
  const names = stops.map((s) => s.name).join(" → ");
  const kmStr = estimatedKm ? ` (ca. ${estimatedKm} km)` : "";
  return `${names}${kmStr}`;
}
