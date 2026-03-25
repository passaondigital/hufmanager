import { useEffect, useState } from "react";
import { Users, UserPlus, UserMinus, Euro, Crown, Ban, Link2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoEmail } from "@/lib/demo-accounts";
import { normalizeToMonthlyMRR } from "@/lib/plan-features";
import { cn } from "@/lib/utils";

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

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  badge?: React.ReactNode;
  accent?: "green" | "blue" | "amber" | "red" | "default";
  large?: boolean;
}

function KpiTile({ icon, label, value, sub, badge, accent = "default", large }: KpiTileProps) {
  const accentColors = {
    green: "from-green-500/10 to-green-500/5 border-green-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    red: "from-red-500/10 to-red-500/5 border-red-500/20",
    default: "from-muted/50 to-muted/20 border-border",
  };

  const iconColors = {
    green: "text-green-500",
    blue: "text-blue-500",
    amber: "text-amber-500",
    red: "text-red-500",
    default: "text-muted-foreground",
  };

  return (
    <div className={cn(
      "relative rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-md",
      accentColors[accent],
      large && "col-span-2 sm:col-span-1"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-background/80", iconColors[accent])}>
          {icon}
        </div>
        {badge}
      </div>
      <p className={cn("font-bold tabular-nums", large ? "text-3xl" : "text-2xl")}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

export default function MissionControlKPIsV2() {
  const [kpis, setKpis] = useState<RealKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealKPIs();
  }, []);

  const fetchRealKPIs = async () => {
    setLoading(true);
    try {
      const { data: providerRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "provider");
      const providerIds = providerRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, is_suspended, plan_override, subscription_status, access_valid_until, created_at")
        .in("id", providerIds).is("deleted_at", null);

      const realProviders = (profiles || []).filter(p => !isDemoEmail(p.email));
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);

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

      const { data: clientRoles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const clientIds = clientRoles?.map(r => r.user_id) || [];
      const { data: clientProfiles } = await supabase
        .from("profiles").select("id, email").in("id", clientIds).is("deleted_at", null);
      const realClients = (clientProfiles || []).filter(p => !isDemoEmail(p.email));

      const demoClientIds = (clientProfiles || []).filter(p => isDemoEmail(p.email)).map(p => p.id);
      const demoProviderIds = (profiles || []).filter(p => isDemoEmail(p.email)).map(p => p.id);
      const allDemoIds = [...demoClientIds, ...demoProviderIds];

      const { count: horseCount } = await supabase
        .from("horses").select("id", { count: "exact", head: true }).is("deleted_at", null);

      const { data: partnerRoles } = await supabase.from("user_roles").select("user_id").eq("role", "partner");
      const partnerIds = partnerRoles?.map(r => r.user_id) || [];
      const { data: partnerProfiles } = await supabase
        .from("profiles").select("id, email")
        .in("id", partnerIds.length > 0 ? partnerIds : ["00000000-0000-0000-0000-000000000000"])
        .is("deleted_at", null);
      const realPartners = (partnerProfiles || []).filter(p => !isDemoEmail(p.email));

      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: payments } = await supabase
        .from("admin_provider_payments")
        .select("amount, provider_id, period_start, period_end")
        .lte("period_start", todayStr).gte("period_end", todayStr);

      const realPayments = (payments || []).filter(p => !allDemoIds.includes(p.provider_id));
      const mrrCents = realPayments.reduce((s, p) => s + normalizeToMonthlyMRR(p.amount || 0, p.period_start ?? null, p.period_end ?? null), 0);
      const payingProviders = new Set(realPayments.map(p => p.provider_id)).size;

      const { data: grants } = await supabase.from("access_grants").select("status, is_active");
      const activeConnections = (grants || []).filter(g => g.is_active && g.status === "active").length;
      const pendingConnections = (grants || []).filter(g => g.status === "pending").length;

      setKpis({
        totalProviders: realProviders.length,
        activeProviders: activeProviders.length,
        lifetimeUsers, suspendedUsers, newThisWeek, newLastWeek, churned,
        churnRate: activeProviders.length > 0 ? (churned / activeProviders.length) * 100 : 0,
        totalClients: realClients.length, totalHorses: horseCount || 0,
        totalPartners: realPartners.length, mrrCents, payingProviders,
        activeConnections, pendingConnections,
      });
    } catch (err) {
      console.error("Error fetching KPIs:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const weekGrowth = kpis.newThisWeek - kpis.newLastWeek;
  const mrr = kpis.mrrCents / 100;
  const arr = mrr * 12;

  return (
    <div className="space-y-3">
      {/* Primary row: Revenue & Growth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          icon={<Euro className="w-5 h-5" />}
          label="MRR (verifiziert)"
          value={`€${mrr.toFixed(0)}`}
          sub={`${kpis.payingProviders} zahlend · ARR €${arr.toFixed(0)}`}
          accent="green"
          large
        />
        <KpiTile
          icon={<Users className="w-5 h-5" />}
          label="Aktive Provider"
          value={kpis.activeProviders}
          sub={`${kpis.totalProviders} gesamt · ${kpis.totalProviders > 0 ? Math.round((kpis.activeProviders / kpis.totalProviders) * 100) : 0}% aktiv`}
          accent="blue"
          large
        />
        <KpiTile
          icon={<UserPlus className="w-5 h-5" />}
          label="Neu diese Woche"
          value={kpis.newThisWeek}
          badge={
            <span className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              weekGrowth >= 0 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"
            )}>
              {weekGrowth >= 0 ? "+" : ""}{weekGrowth} vs LW
            </span>
          }
          accent="blue"
        />
        <KpiTile
          icon={<UserMinus className="w-5 h-5" />}
          label="Churn (30d)"
          value={kpis.churned}
          sub={`${kpis.churnRate.toFixed(1)}% Rate`}
          accent={kpis.churned > 0 ? "red" : "default"}
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <KpiTile
          icon={<span className="text-base">🐴</span>}
          label="Pferde"
          value={kpis.totalHorses}
          accent="default"
        />
        <KpiTile
          icon={<Users className="w-4 h-4" />}
          label="Kunden"
          value={kpis.totalClients}
          accent="default"
        />
        <KpiTile
          icon={<Users className="w-4 h-4" />}
          label="Partner"
          value={kpis.totalPartners}
          accent="default"
        />
        <KpiTile
          icon={<Crown className="w-4 h-4" />}
          label="Lifetime"
          value={kpis.lifetimeUsers}
          accent="amber"
        />
        <KpiTile
          icon={<Link2 className="w-4 h-4" />}
          label="Verbindungen"
          value={kpis.activeConnections}
          sub={`${kpis.pendingConnections} offen`}
          accent="default"
        />
        <KpiTile
          icon={<Ban className="w-4 h-4" />}
          label="Gesperrt"
          value={kpis.suspendedUsers}
          accent={kpis.suspendedUsers > 0 ? "red" : "default"}
        />
      </div>

      <p className="text-[10px] text-muted-foreground/40 text-right">
        Demo-Accounts ausgeschlossen · MRR basiert auf manuellen Zahlungen
      </p>
    </div>
  );
}
