import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, TrendingDown, Coins, Shield, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ReferralRow {
  id: string;
  provider_id: string;
  referred_name_anonymous: string | null;
  status: string;
  monthly_commission: number;
  total_commission: number;
  activated_at: string | null;
  created_at: string;
  provider_name?: string;
  provider_email?: string;
}

interface ProviderSummary {
  provider_id: string;
  provider_name: string;
  provider_email: string;
  total_referred: number;
  active: number;
  inactive: number;
  monthly_commission: number;
  total_commission: number;
}

export function AdminHufrenteOverview() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Admin can read all referrals via is_admin policy
    const { data } = await supabase
      .from("hufrente_referrals")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Fetch provider names
      const providerIds = [...new Set(data.map((r) => r.provider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", providerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setReferrals(
        data.map((r) => ({
          ...r,
          monthly_commission: Number(r.monthly_commission || 0),
          total_commission: Number(r.total_commission || 0),
          provider_name: profileMap.get(r.provider_id)?.full_name || "Unbekannt",
          provider_email: profileMap.get(r.provider_id)?.email || "",
        }))
      );
    } else {
      setReferrals([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totals = useMemo(() => {
    const active = referrals.filter((r) => r.status === "active");
    const inactive = referrals.filter((r) => r.status === "inactive");
    return {
      total: referrals.length,
      active: active.length,
      inactive: inactive.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      monthlyCommission: active.reduce((s, r) => s + r.monthly_commission, 0),
      totalCommission: referrals.reduce((s, r) => s + r.total_commission, 0),
    };
  }, [referrals]);

  const providerSummaries = useMemo((): ProviderSummary[] => {
    const map = new Map<string, ProviderSummary>();
    for (const r of referrals) {
      if (!map.has(r.provider_id)) {
        map.set(r.provider_id, {
          provider_id: r.provider_id,
          provider_name: r.provider_name || "Unbekannt",
          provider_email: r.provider_email || "",
          total_referred: 0,
          active: 0,
          inactive: 0,
          monthly_commission: 0,
          total_commission: 0,
        });
      }
      const s = map.get(r.provider_id)!;
      s.total_referred++;
      if (r.status === "active") { s.active++; s.monthly_commission += r.monthly_commission; }
      if (r.status === "inactive") s.inactive++;
      s.total_commission += r.total_commission;
    }
    return Array.from(map.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [referrals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Hufrente — Affiliate Übersicht</h3>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Gesamt-Empfehlungen", value: totals.total, icon: Users },
          { label: "Aktiv", value: totals.active, icon: TrendingUp },
          { label: "Inaktiv / Verloren", value: totals.inactive, icon: TrendingDown },
          { label: "Provision/Monat", value: `${totals.monthlyCommission.toFixed(2)} €`, icon: Coins },
          { label: "Provision gesamt", value: `${totals.totalCommission.toFixed(2)} €`, icon: Shield },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Provider Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider-Ranking</CardTitle>
          <CardDescription>Wer hat wie viele Nutzer geworben und welche Provision verdient</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {providerSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Noch keine Hufrente-Daten vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-center">Geworben</TableHead>
                    <TableHead className="text-center">Aktiv</TableHead>
                    <TableHead className="text-center">Verloren</TableHead>
                    <TableHead className="text-right">Provision/Monat</TableHead>
                    <TableHead className="text-right">Provision gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerSummaries.map((ps) => (
                    <TableRow key={ps.provider_id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ps.provider_name}</p>
                          <p className="text-xs text-muted-foreground">{ps.provider_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{ps.total_referred}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="text-xs">{ps.active}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {ps.inactive > 0 ? (
                          <Badge variant="secondary" className="text-xs">{ps.inactive}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{ps.monthly_commission.toFixed(2)} €</TableCell>
                      <TableCell className="text-right font-bold">{ps.total_commission.toFixed(2)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Einzelne Referrals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alle Empfehlungen</CardTitle>
          <CardDescription>Chronologische Übersicht aller Hufrente-Empfehlungen</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Keine Empfehlungen vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Empfehlung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Monatlich</TableHead>
                    <TableHead className="text-right">Gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {format(new Date(r.created_at), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.provider_name}</TableCell>
                      <TableCell className="text-sm">{r.referred_name_anonymous || "Anonymisiert"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : r.status === "inactive" ? "destructive" : "secondary"}>
                          {r.status === "active" ? "Aktiv" : r.status === "inactive" ? "Inaktiv" : r.status === "cancelled" ? "Gekündigt" : "Ausstehend"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.monthly_commission.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-sm font-medium">{r.total_commission.toFixed(2)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
