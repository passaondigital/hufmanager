import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFuelPrices, getCheapestPrice, type FuelStation } from "@/hooks/useFuelPrices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Fuel, MapPin, RefreshCw, Navigation, AlertCircle } from "lucide-react";
import { FuelCostBanner } from "./FuelCostBanner";

// Simple geocoding: Extract coords from business address PLZ
// We'll use browser geolocation with fallback to business address geocoding
function useProviderLocation() {
  const { user } = useAuth();
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState(false);

  // Try browser GPS first
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError(true),
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  // Fallback: business_settings address → approximate coords from PLZ
  const { data: businessCoords } = useQuery({
    queryKey: ["business-coords-for-fuel", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("address")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!data?.address) return null;
      // Extract PLZ from address and map to rough coords (Germany)
      const plzMatch = data.address.match(/\b(\d{5})\b/);
      if (!plzMatch) return null;
      const plz = parseInt(plzMatch[1]);
      // Very rough PLZ → coords mapping for Germany
      return plzToApproxCoords(plz);
    },
    enabled: !!user?.id && gpsError,
  });

  if (gpsCoords) return gpsCoords;
  if (businessCoords) return businessCoords;
  return null;
}

// Rough PLZ to coords (major German regions)
function plzToApproxCoords(plz: number): { lat: number; lng: number } {
  const first2 = Math.floor(plz / 1000);
  const plzMap: Record<number, { lat: number; lng: number }> = {
    10: { lat: 52.52, lng: 13.405 },   // Berlin
    20: { lat: 53.55, lng: 9.993 },    // Hamburg
    30: { lat: 52.375, lng: 9.732 },   // Hannover
    40: { lat: 51.225, lng: 6.776 },   // Düsseldorf
    50: { lat: 50.937, lng: 6.96 },    // Köln
    60: { lat: 50.11, lng: 8.68 },     // Frankfurt
    70: { lat: 48.775, lng: 9.182 },   // Stuttgart
    80: { lat: 48.135, lng: 11.582 },  // München
    90: { lat: 49.452, lng: 11.077 },  // Nürnberg
    1: { lat: 51.05, lng: 13.738 },    // Dresden
    4: { lat: 51.34, lng: 12.375 },    // Leipzig
    99: { lat: 50.98, lng: 11.03 },    // Erfurt
  };
  return plzMap[first2] || { lat: 51.16, lng: 10.45 }; // Center of Germany fallback
}

export function FuelPriceWidget() {
  const coords = useProviderLocation();
  const { data, isLoading, error, refetch, isFetching } = useFuelPrices({
    lat: coords?.lat,
    lng: coords?.lng,
    rad: 5,
    enabled: !!coords,
  });

  const stations = data?.stations || [];
  const cheapestDiesel = getCheapestPrice(stations, "diesel");
  const cheapestE5 = getCheapestPrice(stations, "e5");
  const cheapestE10 = getCheapestPrice(stations, "e10");

  if (!coords && !isLoading) {
    return null; // No location available, don't show widget
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Live-Spritpreise
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>Spritpreise konnten nicht geladen werden</span>
          </div>
        ) : (
          <>
            {/* Price Cards */}
            <div className="grid grid-cols-3 gap-2">
              <PriceCard label="Diesel" price={cheapestDiesel.price} />
              <PriceCard label="E5" price={cheapestE5.price} />
              <PriceCard label="E10" price={cheapestE10.price} />
            </div>

            {/* Cheapest Station */}
            {cheapestDiesel.station && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-sm">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {cheapestDiesel.station.brand || cheapestDiesel.station.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {cheapestDiesel.station.street}, {cheapestDiesel.station.place}
                    {" · "}
                    {cheapestDiesel.station.dist.toFixed(1)} km
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                  günstigste
                </Badge>
              </div>
            )}

            {/* Contextual cost banner */}
            <FuelCostBanner stations={stations} />

            <p className="text-[10px] text-muted-foreground text-right">
              Daten: CC BY 4.0 – Tankerkönig.de • 5 km Umkreis
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PriceCard({ label, price }: { label: string; price: number | null }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-foreground">
        {price !== null ? `${price.toFixed(3)}` : "–"}
      </p>
      {price !== null && <p className="text-[10px] text-muted-foreground">€/L</p>}
    </div>
  );
}
