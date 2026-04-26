import { useState, useCallback } from "react";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface UseGeocodeReturn {
  geocode: (street: string, zip: string, city: string) => Promise<GeocodeResult | null>;
  isLoading: boolean;
  error: string | null;
  result: GeocodeResult | null;
  status: "idle" | "loading" | "success" | "error";
}

/**
 * Hook for geocoding addresses using OpenStreetMap Nominatim API
 * Rate limiting: Max 1 request per second (Nominatim policy)
 */
export function useGeocode(): UseGeocodeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const geocode = useCallback(async (street: string, zip: string, city: string): Promise<GeocodeResult | null> => {
    // Validate inputs
    const trimmedStreet = street?.trim() || "";
    const trimmedZip = zip?.trim() || "";
    const trimmedCity = city?.trim() || "";

    // Need at least city or zip to geocode
    if (!trimmedCity && !trimmedZip) {
      setStatus("idle");
      setResult(null);
      return null;
    }

    // Build address string
    const addressParts = [trimmedStreet, trimmedZip, trimmedCity].filter(Boolean);
    const addressQuery = addressParts.join(", ");

    if (!addressQuery) {
      setStatus("idle");
      setResult(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    setStatus("loading");

    try {
      // Nominatim API with Germany country code for better results
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("q", addressQuery);
      url.searchParams.set("countrycodes", "de,at,ch"); // DACH region
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url.toString(), {
        headers: {
          // Nominatim requires a valid User-Agent
          "User-Agent": "Hufi/1.0 (https://hufiapp.de)",
        },
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setError("Adresse nicht gefunden");
        setStatus("error");
        setResult(null);
        return null;
      }

      const firstResult = data[0];
      const geocodeResult: GeocodeResult = {
        lat: parseFloat(firstResult.lat),
        lng: parseFloat(firstResult.lon),
        displayName: firstResult.display_name,
      };

      setResult(geocodeResult);
      setStatus("success");
      setError(null);
      return geocodeResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Geocoding fehlgeschlagen";
      setError(message);
      setStatus("error");
      setResult(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geocode,
    isLoading,
    error,
    result,
    status,
  };
}
