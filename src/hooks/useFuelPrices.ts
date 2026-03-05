import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  diesel: number | null;
  e5: number | null;
  e10: number | null;
  isOpen: boolean;
}

interface FuelPricesResult {
  ok: boolean;
  stations: FuelStation[];
}

async function fetchFuelPrices(lat: number, lng: number, rad = 5, type = "all"): Promise<FuelPricesResult> {
  const { data, error } = await supabase.functions.invoke("fuel-prices", {
    body: { lat, lng, rad, type },
  });
  if (error) throw new Error(error.message || "Fehler beim Abrufen der Spritpreise");
  return data as FuelPricesResult;
}

/**
 * Get cheapest price for a fuel type from stations list
 */
export function getCheapestPrice(stations: FuelStation[], fuelType: "diesel" | "e5" | "e10"): {
  price: number | null;
  station: FuelStation | null;
} {
  let cheapest: FuelStation | null = null;
  let cheapestPrice: number | null = null;

  for (const s of stations) {
    const price = s[fuelType];
    if (price && s.isOpen && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price;
      cheapest = s;
    }
  }

  return { price: cheapestPrice, station: cheapest };
}

/**
 * Map provider_vehicles.fuel_type to Tankerkönig fuel type key
 */
export function mapFuelType(vehicleFuelType: string | null): "diesel" | "e5" | "e10" | null {
  switch (vehicleFuelType?.toLowerCase()) {
    case "diesel":
      return "diesel";
    case "benzin":
    case "super":
      return "e5";
    case "e10":
      return "e10";
    default:
      return null;
  }
}

interface UseFuelPricesOptions {
  lat?: number | null;
  lng?: number | null;
  rad?: number;
  enabled?: boolean;
}

export function useFuelPrices({ lat, lng, rad = 5, enabled = true }: UseFuelPricesOptions) {
  return useQuery({
    queryKey: ["fuel-prices", lat, lng, rad],
    queryFn: () => fetchFuelPrices(lat!, lng!, rad),
    enabled: enabled && !!lat && !!lng,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 10 * 60 * 1000, // 10 min auto-refresh
  });
}
