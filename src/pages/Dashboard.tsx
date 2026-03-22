import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";
import { ProviderSetupWizard } from "@/components/onboarding/ProviderSetupWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { MilestoneCelebration } from "@/components/growth/MilestoneCelebration";
import { CompactOnboardingBanner } from "@/components/dashboard/CompactOnboardingBanner";
import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { PferdeakteInsights } from "@/components/dashboard/PferdeakteInsights";
import { RecentPferdeakten } from "@/components/dashboard/RecentPferdeakten";
import { InsuranceInsights } from "@/components/dashboard/InsuranceInsights";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { CalendarPlus, UserPlus, Route, Calendar, Users, FileText, Inbox } from "lucide-react";

import { DashboardHero, KpiGrid, NextAppointmentCard, QuickActionBar } from "@/components/dashboard-zones";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const isMobile = useIsMobile();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const {
    widgets, isLoading: widgetsLoading,
    updateWidget, addWidget, removeWidget, resetWidgets,
  } = useDashboardWidgets("provider");

  const { data: profileData } = useQuery({
    queryKey: ["provider-profile-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("readable_id, full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // KPI queries
  const { data: todayCount = 0 } = useQuery({
    queryKey: ["prov-today-count", user?.id, todayStr],
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true })
        .eq("provider_id", user!.id).eq("date", todayStr).in("status", ["scheduled", "confirmed"]);
      return count ?? 0;
    },
    enabled: !!user, staleTime: 60_000,
  });

  const { data: clientsCount = 0 } = useQuery({
    queryKey: ["prov-clients-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("created_by_provider_id", user!.id).is("deleted_at", null);
      return count ?? 0;
    },
    enabled: !!user, staleTime: 60_000,
  });

  const { data: leadsCount = 0 } = useQuery({
    queryKey: ["prov-leads-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "neu");
      return count ?? 0;
    },
    enabled: !!user, staleTime: 60_000,
  });

  const displayName = profileData?.full_name || null;

  return (
    <>
      {showOnboarding && <ProviderSetupWizard onComplete={completeOnboarding} />}

      <div className="space-y-4 pb-4">
        {/* ══════ ZONE 1 — HERO ══════ */}
        <DashboardHero name={displayName}>
          {user && (
            <NextAppointmentCard
              userId={user.id}
              role="provider"
              onNavigate={() => navigate("/tour")}
              onDetails={() => {}}
            />
          )}
          <QuickActionBar actions={[
            { key: "termin", label: "Neuer Termin", icon: CalendarPlus, primary: true, onClick: () => navigate("/calendar") },
            { key: "kunde", label: "Neuer Kunde", icon: UserPlus, onClick: () => navigate("/customers") },
            { key: "tour", label: "Tour", icon: Route, onClick: () => navigate("/tour") },
          ]} />
        </DashboardHero>

        {/* Banners */}
        <PushNotificationBanner />
        <MilestoneCelebration />
        <CompactOnboardingBanner />

        {/* ══════ ZONE 2 — KPI GRID ══════ */}
        <KpiGrid columns={4} items={[
          { icon: Calendar, label: "Heute", value: todayCount, sub: `${todayCount} Termine` },
          { icon: Users, label: "Kunden", value: clientsCount, sub: "aktiv" },
          { icon: Inbox, label: "Anfragen", value: leadsCount, sub: "offen", warning: leadsCount > 0 },
          { icon: FileText, label: "Aufträge", value: "–", sub: "offen" },
        ]} />

        {/* ══════ ZONE 3 — DETAILS ══════ */}
        <PferdeakteInsights />
        <InsuranceInsights />
        <RecentPferdeakten />

        {/* Widget Grid + Sidebar */}
        {isMobile ? (
          <div className="space-y-4">
            <WidgetGrid widgets={widgets} isLoading={widgetsLoading} role="provider"
              onUpdateWidget={updateWidget} onAddWidget={addWidget} onRemoveWidget={removeWidget} onResetWidgets={resetWidgets} />
            <DashboardSidebar variant="provider" />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_320px] gap-4">
            <div className="min-w-0">
              <WidgetGrid widgets={widgets} isLoading={widgetsLoading} role="provider"
                onUpdateWidget={updateWidget} onAddWidget={addWidget} onRemoveWidget={removeWidget} onResetWidgets={resetWidgets} />
            </div>
            <div className="min-w-0">
              <DashboardSidebar variant="provider" />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
