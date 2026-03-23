import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { CompactOnboardingBanner } from "@/components/dashboard/CompactOnboardingBanner";
import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useIsMobile } from "@/hooks/use-mobile";
import { Heart, Calendar, FileText, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

import { DashboardHero, KpiGrid, QuickActionBar } from "@/components/dashboard-zones";

export default function PartnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { widgets, isLoading: widgetsLoading, updateWidget, addWidget, removeWidget, resetWidgets } = useDashboardWidgets("partner");

  const { data: profileData } = useQuery({
    queryKey: ["partner-profile-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: horseCount = 0 } = useQuery({
    queryKey: ["partner-horses-kpi", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("horse_partner_access").select("*", { count: "exact", head: true })
        .eq("partner_profile_id", user!.id).eq("status", "active").eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!user, staleTime: 60_000,
  });

  const { data: partnerAppointments = 0 } = useQuery({
    queryKey: ["partner-appointments-kpi", user?.id],
    queryFn: async () => {
      const { data: accessGrants } = await supabase
        .from("horse_partner_access")
        .select("horse_id")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (!accessGrants || accessGrants.length === 0) return 0;
      const horseIds = accessGrants.map(g => g.horse_id);
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .in("horse_id", horseIds)
        .gte("date", new Date().toISOString().slice(0, 10))
        .in("status", ["scheduled", "confirmed"]);
      return count ?? 0;
    },
    enabled: !!user, staleTime: 60_000,
  });

  const { data: lastActivity } = useQuery({
    queryKey: ["partner-last-activity", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horse_partner_access")
        .select("updated_at")
        .eq("partner_profile_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.updated_at;
    },
    enabled: !!user, staleTime: 60_000,
  });

  return (
    <div className="space-y-4 pb-4">
      {/* ZONE 1 */}
      <DashboardHero name={profileData?.full_name} subtitle="Partner-Dashboard">
        <QuickActionBar actions={[
          { key: "pferde", label: "Betreute Pferde", icon: Heart, primary: true, onClick: () => navigate("/partner-horses") },
          { key: "import", label: "Import Center", icon: FileText, onClick: () => navigate("/import-center") },
        ]} />
      </DashboardHero>

      <PushNotificationBanner />
      <CompactOnboardingBanner />

      {/* ZONE 2 */}
      <KpiGrid items={[
        { icon: Heart, label: "Pferde", value: horseCount, sub: "zugewiesen", highlight: true },
        { icon: Calendar, label: "Termine", value: partnerAppointments, sub: "anstehend" },
        { icon: Users, label: "Empfehlungen", value: "–", sub: "Botschafter" },
        { icon: Clock, label: "Letzte Aktivität", value: lastActivity ? formatDistanceToNow(new Date(lastActivity), { locale: de, addSuffix: true }) : "–", sub: "" },
      ]} />

      {/* ZONE 3 — Widget Grid */}
      {isMobile ? (
        <div className="space-y-4">
          <WidgetGrid widgets={widgets} isLoading={widgetsLoading} role="partner"
            onUpdateWidget={updateWidget} onAddWidget={addWidget} onRemoveWidget={removeWidget} onResetWidgets={resetWidgets} />
          <DashboardSidebar variant="partner" />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="min-w-0">
            <WidgetGrid widgets={widgets} isLoading={widgetsLoading} role="partner"
              onUpdateWidget={updateWidget} onAddWidget={addWidget} onRemoveWidget={removeWidget} onResetWidgets={resetWidgets} />
          </div>
          <div className="min-w-0">
            <DashboardSidebar variant="partner" />
          </div>
        </div>
      )}
    </div>
  );
}
