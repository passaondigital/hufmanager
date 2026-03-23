import { useOutletContext } from "react-router-dom";
import { PortalWidgets } from "@/components/portal/PortalWidgets";
import { DashboardHero, KpiGrid } from "@/components/dashboard-zones";
import { Users, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalDashboard() {
  const { org, basePath } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["portal-members", org.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <DashboardHero subtitle={`${org.name} — ${org.type || "Portal"} Dashboard`} />

      <PortalWidgets orgId={org.id} orgType={org.type || "other"} />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Letzte Aktivitäten</h2>
        <p className="text-sm text-muted-foreground">Hier erscheinen bald die neuesten Ereignisse in deinem Portal.</p>
      </div>
    </div>
  );
}
