import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Euro, Footprints, Star } from "lucide-react";
import { Tile, TileHubHeader } from "@/components/ui/TileHub";

export default function AnalyseHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: clientCount } = useQuery({
    queryKey: ["analyse-client-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("access_grants")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user!.id)
        .eq("is_active", true);
      return count || 0;
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["analyse-review-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, count } = await supabase
        .from("reviews")
        .select("rating", { count: "exact" })
        .eq("provider_id", user!.id);
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + (r.rating || 0), 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: count || data.length };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader title="Analyse" subtitle="Zahlen, Daten, Einblicke" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile
          icon={<TrendingUp className="w-10 h-10 text-primary" />}
          title="Statistiken"
          description="Kunden, Pferde, Termine"
          status={clientCount ? `${clientCount} Kunden gesamt` : undefined}
          onClick={() => navigate("/analyse/betriebszahlen")}
        />
        <Tile
          icon={<Euro className="w-10 h-10 text-primary" />}
          title="Umsatz"
          description="Einnahmen & Rechnungen"
          onClick={() => navigate("/rechnungen")}
        />
        <Tile
          icon={<Footprints className="w-10 h-10 text-primary" />}
          title="Pferde-Auswertung"
          description="Huf-Analysen & Behandlungen"
          onClick={() => navigate("/work-mode?tab=analyse")}
        />
        <Tile
          icon={<Star className="w-10 h-10 text-primary" />}
          title="Bewertungen"
          description="Deine öffentlichen Reviews"
          status={
            reviewStats
              ? `⭐ ${reviewStats.avg} · ${reviewStats.count} Bewertungen`
              : undefined
          }
          onClick={() => navigate("/auffassen/feedback")}
        />
      </div>
    </div>
  );
}
