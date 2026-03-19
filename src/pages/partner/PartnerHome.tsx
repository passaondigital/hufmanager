import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeroBanner } from "@/components/dashboard/DashboardHeroBanner";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { CompactOnboardingBanner } from "@/components/dashboard/CompactOnboardingBanner";
import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PartnerHome() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const {
    widgets,
    isLoading: widgetsLoading,
    updateWidget,
    addWidget,
    removeWidget,
    resetWidgets,
  } = useDashboardWidgets("partner");

  const { data: profileData } = useQuery({
    queryKey: ["partner-profile-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profileData?.full_name || null;

  return (
    <div className="space-y-4 pb-4">
      {/* Zone A: Sticky Header — identisch wie Provider */}
      <DashboardHeroBanner fullName={displayName} variant="partner" />

      {/* Banners */}
      <PushNotificationBanner />
      <CompactOnboardingBanner />

      {/* Main Content: Widget Grid + Sidebar — identisch wie Provider */}
      {isMobile ? (
        <div className="space-y-4">
          <WidgetGrid
            widgets={widgets}
            isLoading={widgetsLoading}
            role="partner"
            onUpdateWidget={updateWidget}
            onAddWidget={addWidget}
            onRemoveWidget={removeWidget}
            onResetWidgets={resetWidgets}
          />
          <DashboardSidebar variant="partner" />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="min-w-0">
            <WidgetGrid
              widgets={widgets}
              isLoading={widgetsLoading}
              role="partner"
              onUpdateWidget={updateWidget}
              onAddWidget={addWidget}
              onRemoveWidget={removeWidget}
              onResetWidgets={resetWidgets}
            />
          </div>
          <div className="min-w-0">
            <DashboardSidebar variant="partner" />
          </div>
        </div>
      )}
    </div>
  );
}
