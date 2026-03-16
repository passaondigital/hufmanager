import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Settings, Users } from "lucide-react";

export function AdminPortalCustomers() {
  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin-portal-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, type, plan, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCounts } = useQuery({
    queryKey: ["admin-portal-member-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((m: any) => {
        counts[m.org_id] = (counts[m.org_id] || 0) + 1;
      });
      return counts;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeOrgs = orgs?.filter((o: any) => o.is_active) || [];
  const totalUsers = Object.values(memberCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏢 Portal-Kunden</h1>
        <p className="text-sm text-muted-foreground">
          Aktive Portale: {activeOrgs.length} · Gesamt-Nutzer: {totalUsers}
        </p>
      </div>

      <div className="space-y-3">
        {orgs?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Noch keine Portal-Kunden vorhanden.</p>
        )}
        {orgs?.map((org: any) => (
          <Card key={org.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={org.is_active ? "default" : "secondary"}>
                      {org.is_active ? "✅ Aktiv" : "⏸ Inaktiv"}
                    </Badge>
                    <span className="font-bold text-foreground">{org.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Typ: {org.type || "k.A."}</span>
                    <span>Plan: {org.plan || "Starter"}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {memberCounts?.[org.id] || 0} Nutzer
                    </span>
                    <span>Seit: {new Date(org.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Portal: /portal/{org.slug}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/portal/${org.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Öffnen
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/admin/organizations`}>
                      <Settings className="h-3 w-3 mr-1" />
                      Verwalten
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
