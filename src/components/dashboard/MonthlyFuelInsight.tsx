import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFuelPrices, getCheapestPrice, mapFuelType } from "@/hooks/useFuelPrices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Fuel } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useEffect } from "react";

export function MonthlyFuelInsight() {
  const { user } = useAuth();
  const lastMonth = subMonths(new Date(), 1);
  const monthName = format(lastMonth, "MMMM", { locale: de });
  const monthStart = format(startOfMonth(lastMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(lastMonth), "yyyy-MM-dd");

  // GPS for current fuel prices
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  // Get vehicle data
  const { data: vehicle } = useQuery({
    queryKey: ["primary-vehicle-insight", user?.id],
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

  // Get last month's mileage logs
  const { data: monthlyLogs } = useQuery({
    queryKey: ["monthly-mileage-logs", user?.id, monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_mileage_logs")
        .select("odometer_start, odometer_end")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .gte("log_date", monthStart)
        .lte("log_date", monthEnd);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Current fuel prices
  const { data: fuelData } = useFuelPrices({
    lat: gpsCoords?.lat,
    lng: gpsCoords?.lng,
    enabled: !!gpsCoords && !!vehicle?.average_consumption,
  });

  if (!monthlyLogs?.length || !vehicle?.average_consumption || !fuelData?.stations?.length) {
    return null;
  }

  const totalKm = monthlyLogs.reduce((sum, log) => {
    const dist = (log.odometer_end || 0) - (log.odometer_start || 0);
    return sum + Math.max(0, dist);
  }, 0);

  if (totalKm <= 0) return null;

  const pricePerKm = vehicle.price_per_km || 0.30;
  const actualCost = totalKm * pricePerKm;

  const fuelKey = mapFuelType(vehicle.fuel_type) || "diesel";
  const { price: livePrice } = getCheapestPrice(fuelData.stations, fuelKey);
  if (!livePrice) return null;

  const liveCost = totalKm * (vehicle.average_consumption / 100) * livePrice;
  const diff = actualCost - liveCost;
  const isOverpaid = diff > 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          Fahrtkosten-Insight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm text-foreground">
            Im <span className="font-semibold capitalize">{monthName}</span> hast du{" "}
            <span className="font-semibold">{totalKm.toLocaleString("de-DE")} km</span> gefahren.
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded bg-background">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pauschale</p>
              <p className="text-lg font-bold">{formatCurrency(actualCost)}</p>
              <p className="text-[10px] text-muted-foreground">{pricePerKm.toFixed(2)} €/km</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live-Kalkulation</p>
              <p className="text-lg font-bold">{formatCurrency(liveCost)}</p>
              <p className="text-[10px] text-muted-foreground">{livePrice.toFixed(3)} €/L</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium ${
            isOverpaid
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-green-500/10 text-green-700 dark:text-green-400"
          }`}>
            {isOverpaid ? (
              <TrendingDown className="h-4 w-4 shrink-0" />
            ) : (
              <TrendingUp className="h-4 w-4 shrink-0" />
            )}
            <span>
              Differenz: {formatCurrency(Math.abs(diff))}{" "}
              {isOverpaid ? "– Live wäre günstiger gewesen" : "– deine Pauschale war günstiger"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
