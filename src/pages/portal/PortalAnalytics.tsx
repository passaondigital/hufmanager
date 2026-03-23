import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiGrid, SectionHeader } from "@/components/dashboard-zones";
import { Users, TrendingUp, Calendar, Activity, Loader2 } from "lucide-react";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalAnalytics() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["portal-analytics-members", org.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  const stats = [
    { icon: Users, label: "Mitglieder", value: memberCount, sub: "aktiv", highlight: true },
    { icon: TrendingUp, label: "Wachstum", value: "–", sub: "diesen Monat" },
    { icon: Calendar, label: "Termine", value: "–", sub: "diese Woche" },
    { icon: Activity, label: "Aktivität", value: "–", sub: "Score" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">Analytics</h1>
      <p className="text-sm text-muted-foreground">Kennzahlen und Trends deiner Organisation.</p>

      <KpiGrid columns={4} items={stats} />

      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
        <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">Erweiterte Analytics kommen bald</h3>
        <p className="text-xs text-muted-foreground">Charts, Trends und detaillierte Auswertungen werden hier verfügbar sein.</p>
      </div>
    </div>
  );
}
