import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface StatsPanelProps {
  editor: any;
}

export const StatsPanel = ({ editor }: StatsPanelProps) => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["landing-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [viewsRes, leadsRes, latestViewRes] = await Promise.all([
        supabase
          .from("provider_page_views")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .gte("viewed_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id),
        supabase
          .from("provider_page_views")
          .select("viewed_at")
          .eq("provider_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(1),
      ]);

      return {
        views30d: viewsRes.count || 0,
        totalLeads: leadsRes.count || 0,
        lastVisit: latestViewRes.data?.[0]?.viewed_at || null,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">📊 Seiten-Statistiken</h3>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Aufrufe (30 Tage)" value={stats?.views30d || 0} />
        <StatCard label="Leads gesamt" value={stats?.totalLeads || 0} />
      </div>

      {stats?.lastVisit && (
        <p className="text-xs text-muted-foreground">
          Zuletzt besucht: {formatDistanceToNow(new Date(stats.lastVisit), { locale: de, addSuffix: true })}
        </p>
      )}

      <div className="border rounded-lg p-3 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          💡 Tipp: Teile deinen Link in Social Media und WhatsApp-Gruppen, um mehr Besucher zu bekommen.
        </p>
      </div>
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString("de-DE")}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
