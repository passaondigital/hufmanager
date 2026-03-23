import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Search, Shield, Mail, Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalMitglieder() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["portal-mitglieder", org.id],
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
  const filtered = members.filter((m: any) => {
    const name = (m as any).profiles?.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const stats = [
    { icon: Users, label: "Mitglieder", value: members.length, sub: "gesamt", highlight: true },
    { icon: UserCheck, label: "Aktiv", value: activeCount, sub: "bestätigt" },
    { icon: UserX, label: "Inaktiv", value: members.length - activeCount, sub: "pausiert" },
    { icon: Shield, label: "Admins", value: members.filter((m: any) => m.role === "admin").length, sub: "Verwaltung" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Mitglieder</h1><p className="text-sm text-muted-foreground">{`${org.name}</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Einladen</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Mitglieder suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">Keine Mitglieder gefunden</h3>
          <p className="text-xs text-muted-foreground">Lade neue Mitglieder ein, um loszulegen.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {filtered.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
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
