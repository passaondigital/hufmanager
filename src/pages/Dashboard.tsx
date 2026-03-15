import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ProviderSetupWizard } from "@/components/onboarding/ProviderSetupWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { MilestoneCelebration } from "@/components/growth/MilestoneCelebration";
import { DashboardHeroBanner } from "@/components/dashboard/DashboardHeroBanner";
import { CompactOnboardingBanner } from "@/components/dashboard/CompactOnboardingBanner";
import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { PferdeakteInsights } from "@/components/dashboard/PferdeakteInsights";
import { RecentPferdeakten } from "@/components/dashboard/RecentPferdeakten";
import { InsuranceInsights } from "@/components/dashboard/InsuranceInsights";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const isMobile = useIsMobile();

  const {
    widgets,
    isLoading: widgetsLoading,
    updateWidget,
    addWidget,
    removeWidget,
    resetWidgets,
  } = useDashboardWidgets("provider");

  const { data: profileData } = useQuery({
    queryKey: ["provider-profile-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("readable_id, full_name")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: businessData } = useQuery({
    queryKey: ["business-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("business_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profileData?.full_name || businessData?.business_name || null;

  return (
    <>
      {showOnboarding && (
        <ProviderSetupWizard onComplete={completeOnboarding} />
      )}

      <div className="space-y-4 pb-4">
        {/* Zone A: Sticky Header */}
        <DashboardHeroBanner fullName={displayName} />

        {/* Banners (compact) */}
        <PushNotificationBanner />
        <MilestoneCelebration />
        <CompactOnboardingBanner />

        {/* Pferdeakte Insights + Recent */}
        <PferdeakteInsights />
        <InsuranceInsights />
        <RecentPferdeakten />

        {/* Main Content: Widget Grid + Sidebar */}
        {isMobile ? (
          /* Mobile: stacked layout */
          <div className="space-y-4">
            <WidgetGrid
              widgets={widgets}
              isLoading={widgetsLoading}
              role="provider"
              onUpdateWidget={updateWidget}
              onAddWidget={addWidget}
              onRemoveWidget={removeWidget}
              onResetWidgets={resetWidgets}
            />
            <DashboardSidebar variant="provider" />
          </div>
        ) : (
          /* Desktop: 70/30 split with fixed 320px sidebar */
          <div className="grid grid-cols-[1fr_320px] gap-4">
            {/* Main area */}
            <div className="min-w-0">
              <WidgetGrid
                widgets={widgets}
                isLoading={widgetsLoading}
                role="provider"
                onUpdateWidget={updateWidget}
                onAddWidget={addWidget}
                onRemoveWidget={removeWidget}
                onResetWidgets={resetWidgets}
              />
            </div>

            {/* Sidebar */}
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
