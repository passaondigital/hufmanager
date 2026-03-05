import { supabase } from "@/integrations/supabase/client";

export interface RouteResult {
  distance: number; // km
  duration: number; // minutes
}

/**
 * Calculate route via OpenRouteService (proxied through Supabase Edge Function).
 * Coordinates: array of [lat, lng] (Leaflet format).
 * Returns distance in km and duration in minutes.
 */
export async function calculateRoute(
  positions: [number, number][]
): Promise<RouteResult | null> {
  if (positions.length < 2) return null;

  try {
    // ORS expects [lng, lat] format
    const coordinates = positions.map(([lat, lng]) => [lng, lat]);

    const { data, error } = await supabase.functions.invoke("get-route", {
      body: { coordinates },
    });

    if (error) {
      console.error("Route calculation error:", error);
      return null;
    }

    if (data?.distance != null && data?.duration != null) {
      return {
        distance: Math.round(data.distance / 100) / 10, // m → km (1 decimal)
        duration: Math.round(data.duration / 60), // s → min
      };
    }

    return null;
  } catch (error) {
    console.error("Route calculation failed:", error);
    return null;
  }
}
