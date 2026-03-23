import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, TrendingUp, Activity } from "lucide-react";
import { KpiGrid } from "@/components/dashboard-zones";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalStatistiken() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["portal-stats-members", org.id],
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
    { icon: TrendingUp, label: "Wachstum", value: "+12%", sub: "vs. Vormonat" },
    { icon: Activity, label: "Aktivität", value: "87%", sub: "aktive Mitglieder" },
    { icon: BarChart3, label: "Zertifiziert", value: "64%", sub: "der Mitglieder" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div><h1 className="text-xl font-bold">Statistiken</h1><p className="text-sm text-muted-foreground">{`${org.name}</p></div>

      <KpiGrid columns={4} items={stats} />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Mitgliederentwicklung
          </h3>
          <div className="h-40 flex items-end gap-2 px-2">
            {[35, 42, 38, 55, 48, 62, 58, 72, 65, 78, 82, memberCount || 85].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(v / 100) * 100}%` }}>
                  <div className="w-full h-full bg-primary rounded-t opacity-70" />
                </div>
                <span className="text-[8px] text-muted-foreground">{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Verteilung nach Region
          </h3>
          <div className="space-y-3">
            {[
              { region: "Bayern", anteil: 35 },
              { region: "NRW", anteil: 22 },
              { region: "Niedersachsen", anteil: 18 },
              { region: "Baden-Württemberg", anteil: 15 },
              { region: "Sonstige", anteil: 10 },
            ].map(r => (
              <div key={r.region} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 truncate">{r.region}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${r.anteil}%` }} />
                </div>
                <span className="text-xs font-medium w-8 text-right">{r.anteil}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
