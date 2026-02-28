import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  Euro,
  Crown,
  Ban,
  Clock,
  Link2,
} from "lucide-react";

interface ProviderData {
  id: string;
  is_suspended: boolean | null;
  plan_override: string | null;
  subscription_status: string | null;
  access_valid_until: string | null;
  created_at: string;
  client_count: number;
  horse_count: number;
  base_price: number | null;
}

interface ConnectStats {
  activeConnections: number;
  pendingConnections: number;
  totalInvitations: number;
  acceptedInvitations: number;
}

interface MissionControlKPIsProps {
  providers: ProviderData[];
  connectStats?: ConnectStats | null;
}

export default function MissionControlKPIs({ providers, connectStats }: MissionControlKPIsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active users (not suspended, with valid access)
    const activeProviders = providers.filter((p) => {
      if (p.is_suspended) return false;
      if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") return true;
      if (p.access_valid_until) {
        return new Date(p.access_valid_until) > now;
      }
      return p.subscription_status === "active";
    });

    // Lifetime users
    const lifetimeUsers = providers.filter(
      (p) => p.plan_override === "lifetime_grant"
    ).length;

    // Suspended users
    const suspendedUsers = providers.filter((p) => p.is_suspended).length;

    // New registrations this week
    const newThisWeek = providers.filter(
      (p) => new Date(p.created_at) >= oneWeekAgo
    ).length;

    // New registrations last week (for comparison)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const newLastWeek = providers.filter(
      (p) => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo
    ).length;

    // Churn: users whose access expired in the last 30 days
    const churned = providers.filter((p) => {
      if (p.is_suspended) return false;
      if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") return false;
      if (p.access_valid_until) {
        const accessDate = new Date(p.access_valid_until);
        return accessDate < now && accessDate >= oneMonthAgo;
      }
      return false;
    }).length;

    // MRR Estimation (rough)
    // Assuming average €29/month for active subscribers
    const paidSubscribers = activeProviders.filter(
      (p) =>
        p.plan_override !== "lifetime_grant" &&
        p.plan_override !== "employee" &&
        p.plan_override !== "beta_tester"
    ).length;
    const estimatedMRR = paidSubscribers * 29;

    // Total clients and horses
    const totalClients = providers.reduce((sum, p) => sum + p.client_count, 0);
    const totalHorses = providers.reduce((sum, p) => sum + p.horse_count, 0);

    // Average base price
    const pricesWithValue = providers.filter((p) => p.base_price && p.base_price > 0);
    const avgBasePrice = pricesWithValue.length > 0
      ? pricesWithValue.reduce((sum, p) => sum + (p.base_price || 0), 0) / pricesWithValue.length
      : 0;

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      lifetimeUsers,
      suspendedUsers,
      newThisWeek,
      newLastWeek,
      churned,
      churnRate: activeProviders.length > 0 ? (churned / activeProviders.length) * 100 : 0,
      estimatedMRR,
      paidSubscribers,
      totalClients,
      totalHorses,
      avgBasePrice,
    };
  }, [providers]);

  const weekGrowth = stats.newThisWeek - stats.newLastWeek;
  const growthPositive = weekGrowth >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      {/* Active Users */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Users className="w-5 h-5 text-green-500" />
          <Badge variant="outline" className="text-xs">
            {Math.round((stats.activeProviders / stats.totalProviders) * 100) || 0}%
          </Badge>
        </div>
        <p className="text-2xl font-bold mt-2">{stats.activeProviders}</p>
        <p className="text-xs text-muted-foreground">Aktive User</p>
      </Card>

      {/* New This Week */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <UserPlus className="w-5 h-5 text-blue-500" />
          <Badge
            variant={growthPositive ? "default" : "secondary"}
            className={`text-xs ${growthPositive ? "bg-green-500" : "bg-red-500"}`}
          >
            {growthPositive ? "+" : ""}{weekGrowth}
          </Badge>
        </div>
        <p className="text-2xl font-bold mt-2">{stats.newThisWeek}</p>
        <p className="text-xs text-muted-foreground">Neu diese Woche</p>
      </Card>

      {/* MRR */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Euro className="w-5 h-5 text-amber-500" />
          <Badge variant="outline" className="text-xs">
            ~{stats.paidSubscribers} zahlend
          </Badge>
        </div>
        <p className="text-2xl font-bold mt-2">€{stats.estimatedMRR}</p>
        <p className="text-xs text-muted-foreground">MRR (geschätzt)</p>
      </Card>

      {/* Churn */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <UserMinus className="w-5 h-5 text-red-500" />
          {stats.churned > 0 && (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>
        <p className="text-2xl font-bold mt-2">{stats.churned}</p>
        <p className="text-xs text-muted-foreground">
          Churn (30 Tage) · {stats.churnRate.toFixed(1)}%
        </p>
      </Card>

      {/* Lifetime */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Crown className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-2xl font-bold mt-2">{stats.lifetimeUsers}</p>
        <p className="text-xs text-muted-foreground">Lifetime-User</p>
      </Card>

      {/* Suspended */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Ban className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-2xl font-bold mt-2">{stats.suspendedUsers}</p>
        <p className="text-xs text-muted-foreground">Gesperrt</p>
      </Card>

      {/* Total Clients */}
      <Card className="p-4 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <Users className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold mt-2">{stats.totalClients}</p>
        <p className="text-xs text-muted-foreground">Kunden gesamt</p>
      </Card>

      {/* Total Horses */}
      <Card className="p-4 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-lg">🐴</span>
        </div>
        <p className="text-2xl font-bold mt-2">{stats.totalHorses}</p>
        <p className="text-xs text-muted-foreground">Pferde gesamt</p>
      </Card>

      {/* Average Price */}
      <Card className="p-4 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <Euro className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold mt-2">€{stats.avgBasePrice.toFixed(0)}</p>
        <p className="text-xs text-muted-foreground">Ø Grundpreis</p>
      </Card>

      {/* HM Connect Stats */}
      {connectStats && (
        <>
          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <Link2 className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-xs">
                {connectStats.pendingConnections} offen
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2">{connectStats.activeConnections}</p>
            <p className="text-xs text-muted-foreground">Aktive Verbindungen</p>
          </Card>

          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <Badge variant="outline" className="text-xs">
                {connectStats.acceptedInvitations} angen.
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2">{connectStats.totalInvitations}</p>
            <p className="text-xs text-muted-foreground">Einladungen gesamt</p>
          </Card>
        </>
      )}
    </div>
  );
}
