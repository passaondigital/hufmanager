import { supabase } from "@/integrations/supabase/client";

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  type: number;
  name: string;
  way_points: number[];
}

export interface RouteResult {
  distance: number; // km
  duration: number; // minutes
  geometry?: GeoJSON.LineString;
  steps?: RouteStep[];
  optimized_order?: number[];
}

/**
 * Calculate route via OpenRouteService (proxied through Supabase Edge Function).
 * Coordinates: array of [lat, lng] (Leaflet format).
 * Returns distance in km, duration in minutes, GeoJSON geometry, and turn-by-turn steps.
 */
export async function calculateRoute(
  positions: [number, number][],
  options?: { optimize?: boolean; vehicle?: { trailerHeight?: number } }
): Promise<RouteResult | null> {
  if (positions.length < 2) return null;

  try {
    // ORS expects [lng, lat] format
    const coordinates = positions.map(([lat, lng]) => [lng, lat]);

    const { data, error } = await supabase.functions.invoke("get-route", {
      body: {
        coordinates,
        optimize: options?.optimize,
        vehicle: options?.vehicle,
      },
    });

    if (error) {
      console.error("Route calculation error:", error);
      return null;
    }

    if (data?.distance != null && data?.duration != null) {
      return {
        distance: Math.round(data.distance / 100) / 10, // m → km (1 decimal)
        duration: Math.round(data.duration / 60), // s → min
        geometry: data.geometry || undefined,
        steps: data.steps || undefined,
        optimized_order: data.optimized_order || undefined,
      };
    }

    return null;
  } catch (error) {
    console.error("Route calculation failed:", error);
    return null;
  }
}
