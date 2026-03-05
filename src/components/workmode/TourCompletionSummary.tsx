import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFuelPrices, getCheapestPrice, mapFuelType } from "@/hooks/useFuelPrices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fuel, FileText, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TourCompletionSummaryProps {
  distanceKm: number;
  onDismiss: () => void;
}

export function TourCompletionSummary({ distanceKm, onDismiss }: TourCompletionSummaryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-completion", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_vehicles")
        .select("average_consumption, fuel_type, price_per_km")
        .eq("provider_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: fuelData } = useFuelPrices({
    lat: gpsCoords?.lat,
    lng: gpsCoords?.lng,
    enabled: !!gpsCoords && !!vehicle?.average_consumption,
  });

  const fuelKey = mapFuelType(vehicle?.fuel_type) || "diesel";
  const { price: livePrice } = fuelData?.stations
    ? getCheapestPrice(fuelData.stations, fuelKey)
    : { price: null };

  const liveFuelCost = livePrice && vehicle?.average_consumption
    ? Math.round(distanceKm * (vehicle.average_consumption / 100) * livePrice * 100) / 100
    : null;

  const standardCost = Math.round(distanceKm * (vehicle?.price_per_km || 0.30) * 100) / 100;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  if (distanceKm <= 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Tour-Zusammenfassung</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Heutige Tour:</span>
            <span className="font-medium">{distanceKm} km</span>
          </div>
          {liveFuelCost !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Fuel className="h-3.5 w-3.5" />
                Spritkosten real:
              </span>
              <span className="font-semibold text-primary">
                {formatCurrency(liveFuelCost)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({livePrice?.toFixed(3)} €/L)
                </span>
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pauschale:</span>
            <span className="font-medium">{formatCurrency(standardCost)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => navigate("/rechnungen")}
          >
            <FileText className="h-3.5 w-3.5" />
            Rechnung erstellen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
          >
            Später
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
