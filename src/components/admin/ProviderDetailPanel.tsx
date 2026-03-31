import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, AlertCircle, Mail,
  ChevronRight, Users, ShieldCheck, Clock,
} from "lucide-react";
import { ProviderTimeline } from "./ProviderTimeline";
import { ProviderManualActions } from "./ProviderManualActions";
import { ProviderDocumentsSection } from "./ProviderDocumentsSection";
import { AccountNotesPanel } from "./AccountNotesPanel";

interface ProviderDetailPanelProps {
  providerId: string;
  providerEmail: string | null;
}

interface ClientInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  readable_id: string | null;
  status: string;
  is_active: boolean | null;
}

interface HorseInfo {
  id: string;
  name: string;
  readable_id: string | null;
  owner_id: string | null;
  owner_readable_id: string | null;
  owner_name: string | null;
}

export function ProviderDetailPanel({ providerId, providerEmail }: ProviderDetailPanelProps) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [horses, setHorses] = useState<HorseInfo[]>([]);

  useEffect(() => {
    loadData();
  }, [providerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load access_grants for this provider
      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id, status, is_active")
        .eq("provider_id", providerId);

      const clientIds = [...new Set((grants || []).map(g => g.client_id))];
      const grantMap = new Map<string, { status: string; is_active: boolean | null }>();
      (grants || []).forEach(g => {
        // Keep the most relevant grant per client
        if (!grantMap.has(g.client_id) || g.is_active) {
          grantMap.set(g.client_id, { status: g.status, is_active: g.is_active });
        }
      });

      // 2. Load client profiles
      let clientList: ClientInfo[] = [];
      if (clientIds.length > 0) {
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, readable_id")
          .in("id", clientIds)
          .is("deleted_at", null);

        clientList = (clientProfiles || []).map(p => {
          const grant = grantMap.get(p.id);
          return {
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            readable_id: p.readable_id,
            status: grant?.status || "unknown",
            is_active: grant?.is_active ?? null,
          };
        });
      }

      // 3. Load horses accessible to this provider
      const { data: horseData } = await supabase
        .from("horses")
        .select("id, name, readable_id, owner_id")
        .in("owner_id", clientIds.length > 0 ? clientIds : ["__none__"])
        .is("deleted_at", null)
        .order("name")
        .limit(200);

      // Build owner lookup from clientList
      const ownerMap = new Map<string, { readable_id: string | null; full_name: string | null }>();
      clientList.forEach(c => ownerMap.set(c.id, { readable_id: c.readable_id, full_name: c.full_name }));

      const horseList: HorseInfo[] = (horseData || []).map(h => {
        const owner = h.owner_id ? ownerMap.get(h.owner_id) : null;
        return {
          id: h.id,
          name: h.name,
          readable_id: h.readable_id,
          owner_id: h.owner_id,
          owner_readable_id: owner?.readable_id || null,
          owner_name: owner?.full_name || null,
        };
      });

      setClients(clientList);
      setHorses(horseList);
    } catch (err) {
      console.error("Error loading provider details:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEmailDomain = (email: string | null) => {
    if (!email) return "—";
    const parts = email.split("@");
    return parts.length > 1 ? `@${parts[1]}` : "—";
  };

  const getGrantStatusBadge = (status: string, isActive: boolean | null) => {
    if (isActive && status === "active") return <Badge variant="default" className="text-xs">active</Badge>;
    if (status === "pending") return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/30">pending</Badge>;
    return <Badge variant="outline" className="text-xs text-muted-foreground">revoked</Badge>;
  };

  // ID Validation
  const clientIdConflicts = clients.filter(c => c.readable_id && c.readable_id.startsWith("PID"));
  const orphanedHorses = horses.filter(h => !h.owner_id || (!clients.some(c => c.id === h.owner_id)));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Lade Details…</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 bg-muted/20 border-t">
      {/* ID Validation Warnings */}
      {(clientIdConflicts.length > 0 || orphanedHorses.length > 0) && (
        <div className="space-y-2">
          {clientIdConflicts.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-destructive font-medium">ID-Konflikt:</span>
              <span>{c.full_name || c.email || c.id.slice(0, 8)} hat #{c.readable_id} (erwartet: #KID-…)</span>
            </div>
          ))}
          {orphanedHorses.map(h => (
            <div key={h.id} className="flex items-center gap-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
              <span className="text-yellow-700 font-medium">Verwaistes Pferd:</span>
              <span>{h.name} (#{h.readable_id || "—"}) – kein zugeordneter Client</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clients Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="w-4 h-4 text-primary" />
            Zugeordnete Kunden ({clients.length})
          </div>
          {clients.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Keine Kunden verknüpft</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {clients.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-background border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {c.readable_id || "—"}
                    </code>
                    {c.readable_id?.startsWith("PID") && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">ID-Konflikt</Badge>
                    )}
                    <span className="truncate">{c.full_name || "Anonym"}</span>
                    <span className="text-muted-foreground truncate">{getEmailDomain(c.email)}</span>
                  </div>
                  {getGrantStatusBadge(c.status, c.is_active)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Horses Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ChevronRight className="w-4 h-4 text-primary" />
            Zugeordnete Pferde ({horses.length})
          </div>
          {horses.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Keine Pferde gefunden</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {horses.map(h => (
                <div key={h.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-background border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {h.readable_id || "—"}
                    </code>
                    {!h.readable_id && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-yellow-600 border-yellow-500/30">Keine EQID</Badge>
                    )}
                    {!h.owner_id || !clients.some(c => c.id === h.owner_id) ? (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-yellow-600 border-yellow-500/30">Verwaist</Badge>
                    ) : null}
                    <span className="truncate font-medium">{h.name}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {h.owner_readable_id ? `#${h.owner_readable_id}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Notes (new system) */}
      <AccountNotesPanel accountId={providerId} accountType="provider" />

      {/* Support Quick Actions */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Support-Schnellaktionen
        </div>
        <div className="flex gap-3">
          {providerEmail && (
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <a href={`mailto:${providerEmail}`}>
                <Mail className="w-4 h-4 mr-1" />
                E-Mail senden
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <ProviderDocumentsSection providerId={providerId} />

      {/* Timeline */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="w-4 h-4 text-primary" /> Timeline
        </div>
        <ProviderTimeline providerId={providerId} />
      </div>

      {/* Manual Actions */}
      <ProviderManualActions
        providerId={providerId}
        providerName={clients?.[0]?.full_name || providerEmail || providerId}
        providerEmail={providerEmail}
        providerPlan="pro"
        onRefresh={loadData}
      />
    </div>
  );
}
