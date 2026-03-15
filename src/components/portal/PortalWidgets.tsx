import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, FileText, AlertTriangle, ShoppingCart, Users, GraduationCap, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <p className="text-xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PortalWidgetsProps {
  orgId: string;
  orgType: string;
}

export function PortalWidgets({ orgId, orgType }: PortalWidgetsProps) {
  // Insurance widgets
  const { data: policiesCount, isLoading: pLoading } = useQuery({
    queryKey: ["portal-policies-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("insurance_policies")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active");
      return count || 0;
    },
    enabled: orgType === "insurance",
  });

  const { data: claimsCount, isLoading: cLoading } = useQuery({
    queryKey: ["portal-claims-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("insurance_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "reported");
      // TODO: Filter by org_id through policy join
      return count || 0;
    },
    enabled: orgType === "insurance",
  });

  // Product widgets
  const { data: productsCount, isLoading: prLoading } = useQuery({
    queryKey: ["portal-products-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_products")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true);
      return count || 0;
    },
    enabled: orgType === "manufacturer" || orgType === "supplier",
  });

  const { data: ordersCount, isLoading: oLoading } = useQuery({
    queryKey: ["portal-orders-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_orders")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: orgType === "manufacturer" || orgType === "supplier",
  });

  // School widgets
  const { data: coursesCount, isLoading: coLoading } = useQuery({
    queryKey: ["portal-courses-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("school_courses")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active");
      return count || 0;
    },
    enabled: orgType === "school",
  });

  const { data: membersCount, isLoading: mLoading } = useQuery({
    queryKey: ["portal-members-count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true);
      return count || 0;
    },
    enabled: true,
  });

  if (orgType === "insurance") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Aktive Policen" value={policiesCount ?? 0} icon={FileText} loading={pLoading} />
        <StatCard title="Offene Schadensfälle" value={claimsCount ?? 0} icon={AlertTriangle} loading={cLoading} />
        <StatCard title="Team-Mitglieder" value={membersCount ?? 0} icon={Users} loading={mLoading} />
        <StatCard title="Ø Präventions-Score" value="–" icon={TrendingUp} />
      </div>
    );
  }

  if (orgType === "manufacturer" || orgType === "supplier") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Produkte im Katalog" value={productsCount ?? 0} icon={Package} loading={prLoading} />
        <StatCard title="Offene Bestellungen" value={ordersCount ?? 0} icon={ShoppingCart} loading={oLoading} />
        <StatCard title="Team-Mitglieder" value={membersCount ?? 0} icon={Users} loading={mLoading} />
        <StatCard title="Umsatz diesen Monat" value="–" icon={TrendingUp} />
      </div>
    );
  }

  if (orgType === "school") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Aktive Kurse" value={coursesCount ?? 0} icon={GraduationCap} loading={coLoading} />
        <StatCard title="Team-Mitglieder" value={membersCount ?? 0} icon={Users} loading={mLoading} />
        <StatCard title="Ø Prüfungsergebnis" value="–" icon={TrendingUp} />
        <StatCard title="Ausstehende Bewertungen" value="–" icon={FileText} />
      </div>
    );
  }

  // Default / association
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard title="Mitglieder" value={membersCount ?? 0} icon={Users} loading={mLoading} />
      <StatCard title="Statistiken" value="–" icon={TrendingUp} />
      <StatCard title="Standards" value="–" icon={FileText} />
    </div>
  );
}
