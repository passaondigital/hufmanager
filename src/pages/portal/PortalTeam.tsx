import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, Shield, Mail } from "lucide-react";
import type { Organization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

export default function PortalTeam() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["portal-team", org.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("id, role, is_active, joined_at, profiles(full_name, email, avatar_url)")
        .eq("org_id", org.id)
        .order("joined_at", { ascending: false });
      return data ?? [];
    },
  });

  const activeCount = members.filter((m: any) => m.is_active).length;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Team-Verwaltung</h1>
        <span className="text-sm text-muted-foreground">{activeCount} aktiv</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">Noch keine Team-Mitglieder</h3>
          <p className="text-xs text-muted-foreground">Lade dein Team ein, um gemeinsam im Portal zu arbeiten.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {(m.profiles?.full_name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.profiles?.full_name || "Unbekannt"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />{m.profiles?.email || "–"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize flex items-center gap-1">
                  <Shield className="h-3 w-3" />{m.role || "member"}
                </span>
                <div className={cn("w-2 h-2 rounded-full", m.is_active ? "bg-green-500" : "bg-muted-foreground/30")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
