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
import { Heart, Calendar, FileText, Users } from "lucide-react";

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
        { icon: Heart, label: "Betreute Pferde", value: horseCount, highlight: true },
        { icon: Calendar, label: "Termine", value: "–", sub: "Anstehend" },
        { icon: Users, label: "Empfehlungen", value: "–", sub: "Aktiv" },
        { icon: FileText, label: "Aktivität", value: "–", sub: "Diesen Monat" },
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
