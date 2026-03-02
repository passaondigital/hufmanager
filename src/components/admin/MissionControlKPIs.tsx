import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserPlus, UserMinus, Euro, Crown, Ban, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoEmail } from "@/lib/demo-accounts";
import { normalizeToMonthlyMRR } from "@/lib/plan-features";

interface RealKPIs {
  totalProviders: number;
  activeProviders: number;
  lifetimeUsers: number;
  suspendedUsers: number;
  newThisWeek: number;
  newLastWeek: number;
  churned: number;
  churnRate: number;
  totalClients: number;
  totalHorses: number;
  totalPartners: number;
  mrrCents: number;
  payingProviders: number;
  activeConnections: number;
  pendingConnections: number;
}

export default function MissionControlKPIs() {
  const [kpis, setKpis] = useState<RealKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealKPIs();
  }, []);

  const fetchRealKPIs = async () => {
    setLoading(true);
    try {
      // 1. Get all provider profiles (excluding demo)
      const { data: providerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");
      const providerIds = providerRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, is_suspended, plan_override, subscription_status, access_valid_until, created_at")
        .in("id", providerIds)
        .is("deleted_at", null);

      // Filter out demo accounts
      const realProviders = (profiles || []).filter(p => !isDemoEmail(p.email));

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeProviders = realProviders.filter(p => {
        if (p.is_suspended) return false;
        if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") return true;
        if (p.access_valid_until) return new Date(p.access_valid_until) > now;
        return p.subscription_status === "active";
      });

      const lifetimeUsers = realProviders.filter(p => p.plan_override === "lifetime_grant").length;
      const suspendedUsers = realProviders.filter(p => p.is_suspended).length;
      const newThisWeek = realProviders.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
      const newLastWeek = realProviders.filter(p => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo).length;
      const churned = realProviders.filter(p => {
        if (p.is_suspended || p.plan_override === "lifetime_grant" || p.plan_override === "employee") return false;
        if (p.access_valid_until) {
          const d = new Date(p.access_valid_until);
          return d < now && d >= oneMonthAgo;
        }
        return false;
      }).length;

      // 2. Real client count (excluding demo)
      const { data: clientRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");
      const clientIds = clientRoles?.map(r => r.user_id) || [];
      const { data: clientProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", clientIds)
        .is("deleted_at", null);
      const realClients = (clientProfiles || []).filter(p => !isDemoEmail(p.email));

      // 3. Real horse count (excluding demo owners)
      const demoClientIds = (clientProfiles || []).filter(p => isDemoEmail(p.email)).map(p => p.id);
      const demoProviderIds = (profiles || []).filter(p => isDemoEmail(p.email)).map(p => p.id);
      const allDemoIds = [...demoClientIds, ...demoProviderIds];
      
      const { count: horseCount } = await supabase
        .from("horses")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      // 4. Real partner count
      const { data: partnerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "partner");
      const partnerIds = partnerRoles?.map(r => r.user_id) || [];
      const { data: partnerProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", partnerIds.length > 0 ? partnerIds : ["00000000-0000-0000-0000-000000000000"])
        .is("deleted_at", null);
      const realPartners = (partnerProfiles || []).filter(p => !isDemoEmail(p.email));

      // 5. Real MRR from admin_provider_payments
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: payments } = await supabase
        .from("admin_provider_payments")
        .select("amount, provider_id, period_start, period_end")
        .lte("period_start", todayStr)
        .gte("period_end", todayStr);
      
      // Filter out demo provider payments & normalize annual payments to monthly
      const realPayments = (payments || []).filter(p => !allDemoIds.includes(p.provider_id));
      const mrrCents = realPayments.reduce((s, p) => s + normalizeToMonthlyMRR(p.amount || 0, p.period_start ?? null, p.period_end ?? null), 0);
      const payingProviders = new Set(realPayments.map(p => p.provider_id)).size;

      // 6. Connect stats
      const { data: grants } = await supabase
        .from("access_grants")
        .select("status, is_active");
      const activeConnections = (grants || []).filter(g => g.is_active && g.status === "active").length;
      const pendingConnections = (grants || []).filter(g => g.status === "pending").length;

      setKpis({
        totalProviders: realProviders.length,
        activeProviders: activeProviders.length,
        lifetimeUsers,
        suspendedUsers,
        newThisWeek,
        newLastWeek,
        churned,
        churnRate: activeProviders.length > 0 ? (churned / activeProviders.length) * 100 : 0,
        totalClients: realClients.length,
        totalHorses: horseCount || 0,
        totalPartners: realPartners.length,
        mrrCents,
        payingProviders,
        activeConnections,
        pendingConnections,
      });
    } catch (err) {
      console.error("Error fetching KPIs:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 w-8 bg-muted rounded mb-3" />
            <div className="h-7 w-16 bg-muted rounded mb-1" />
            <div className="h-3 w-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const weekGrowth = kpis.newThisWeek - kpis.newLastWeek;
  const growthPositive = weekGrowth >= 0;
  const mrr = kpis.mrrCents / 100;
  const arr = mrr * 12;

  return (
    <div className="space-y-2 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Active Providers */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-green-500" />
            <Badge variant="outline" className="text-xs">
              {kpis.totalProviders > 0 ? Math.round((kpis.activeProviders / kpis.totalProviders) * 100) : 0}%
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-2">{kpis.activeProviders}</p>
          <p className="text-xs text-muted-foreground">Aktive Provider</p>
        </Card>

        {/* New This Week */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <Badge variant={growthPositive ? "default" : "secondary"} className={`text-xs ${growthPositive ? "bg-green-500" : "bg-red-500"}`}>
              {growthPositive ? "+" : ""}{weekGrowth}
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-2">{kpis.newThisWeek}</p>
          <p className="text-xs text-muted-foreground">Neu diese Woche</p>
        </Card>

        {/* Real MRR */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Euro className="w-5 h-5 text-amber-500" />
            <Badge variant="outline" className="text-xs">
              {kpis.payingProviders} zahlend
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-2">€{mrr.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">MRR (verifiziert)</p>
        </Card>

        {/* Churn */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <UserMinus className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{kpis.churned}</p>
          <p className="text-xs text-muted-foreground">Churn (30d) · {kpis.churnRate.toFixed(1)}%</p>
        </Card>

        {/* Lifetime */}
        <Card className="p-4">
          <Crown className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-bold mt-2">{kpis.lifetimeUsers}</p>
          <p className="text-xs text-muted-foreground">Lifetime-User</p>
        </Card>

        {/* Suspended */}
        <Card className="p-4">
          <Ban className="w-5 h-5 text-destructive" />
          <p className="text-2xl font-bold mt-2">{kpis.suspendedUsers}</p>
          <p className="text-xs text-muted-foreground">Gesperrt</p>
        </Card>

        {/* Clients */}
        <Card className="p-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <p className="text-2xl font-bold mt-2">{kpis.totalClients}</p>
          <p className="text-xs text-muted-foreground">Kunden (echt)</p>
        </Card>

        {/* Horses */}
        <Card className="p-4">
          <span className="text-lg">🐴</span>
          <p className="text-2xl font-bold mt-2">{kpis.totalHorses}</p>
          <p className="text-xs text-muted-foreground">Pferde gesamt</p>
        </Card>

        {/* Partners */}
        <Card className="p-4">
          <Users className="w-5 h-5 text-primary" />
          <p className="text-2xl font-bold mt-2">{kpis.totalPartners}</p>
          <p className="text-xs text-muted-foreground">Partner (echt)</p>
        </Card>

        {/* ARR */}
        <Card className="p-4">
          <Euro className="w-5 h-5 text-green-500" />
          <p className="text-2xl font-bold mt-2">€{arr.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">ARR (verifiziert)</p>
        </Card>

        {/* Connections */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Link2 className="w-5 h-5 text-primary" />
            <Badge variant="outline" className="text-xs">{kpis.pendingConnections} offen</Badge>
          </div>
          <p className="text-2xl font-bold mt-2">{kpis.activeConnections}</p>
          <p className="text-xs text-muted-foreground">Aktive Verbindungen</p>
        </Card>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-right">
        ⚠️ Demo-Accounts ausgeschlossen · MRR/ARR basiert auf manuell erfassten Zahlungen
      </p>
    </div>
  );
}
