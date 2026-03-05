import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCheapestPrice, mapFuelType, type FuelStation } from "@/hooks/useFuelPrices";
import { format } from "date-fns";
import { Lightbulb, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FuelCostBannerProps {
  stations: FuelStation[];
}

export function FuelCostBanner({ stations }: FuelCostBannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  // Get today's planned tour distance from appointments
  const { data: todayKm } = useQuery({
    queryKey: ["today-tour-km", user?.id, today],
    queryFn: async () => {
      // Check daily_tours first
      const { data: tour } = await supabase
        .from("daily_tours")
        .select("total_distance_km")
        .eq("provider_id", user!.id)
        .eq("tour_date", today)
        .maybeSingle();

      if (tour?.total_distance_km) return tour.total_distance_km;

      // Fallback: count today's appointments and estimate ~15km avg between stops
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user!.id)
        .eq("date", today)
        .neq("status", "cancelled");

      return (count || 0) * 15; // rough estimate
    },
    enabled: !!user?.id,
  });

  // Get vehicle data for consumption
  const { data: vehicle } = useQuery({
    queryKey: ["primary-vehicle-banner", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_vehicles")
        .select("average_consumption, fuel_type")
        .eq("provider_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const km = todayKm || 0;
  if (km <= 0 || !vehicle?.average_consumption) return null;

  const fuelKey = mapFuelType(vehicle.fuel_type) || "diesel";
  const { price } = getCheapestPrice(stations, fuelKey);
  if (!price) return null;

  const fuelCost = Math.round(km * (vehicle.average_consumption / 100) * price * 100) / 100;

  return (
    <button
      onClick={() => navigate("/rechnungen")}
      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-left hover:bg-primary/10 transition-colors group"
    >
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground leading-relaxed">
          <span className="capitalize">{fuelKey}</span> heute{" "}
          <span className="font-semibold">{price.toFixed(2)} €/L</span> – deine
          Fahrtkosten für heute: ~
          <span className="font-semibold text-primary">{fuelCost.toFixed(2)} €</span>{" "}
          bei {km} km geplantem Tourtag.
        </p>
        <span className="text-[11px] text-primary font-medium flex items-center gap-1 mt-1 group-hover:underline">
          Jetzt Angebote prüfen
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}
