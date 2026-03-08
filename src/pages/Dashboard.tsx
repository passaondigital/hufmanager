import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ProviderSetupWizard } from "@/components/onboarding/ProviderSetupWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { MilestoneCelebration } from "@/components/growth/MilestoneCelebration";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CompactOnboardingBanner } from "@/components/dashboard/CompactOnboardingBanner";
import { WeekCalendarWidget } from "@/components/dashboard/WeekCalendarWidget";
import { DueMapWidget } from "@/components/dashboard/DueMapWidget";
import { TodayCockpitWidget } from "@/components/dashboard/TodayCockpitWidget";
import { LeadsWidget } from "@/components/dashboard/LeadsWidget";
import { CompactFuelWidget } from "@/components/dashboard/CompactFuelWidget";
import { CompactDocumentsWidget } from "@/components/dashboard/CompactDocumentsWidget";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const isMobile = useIsMobile();

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
        <DashboardHeader fullName={displayName} />

        {/* Banners (compact) */}
        <PushNotificationBanner />
        <MilestoneCelebration />
        <CompactOnboardingBanner />

        {/* Main Content: Zone B + Zone C */}
        {isMobile ? (
          /* Mobile: stacked layout */
          <div className="space-y-4">
            <TodayCockpitWidget />
            <WeekCalendarWidget />
            <LeadsWidget />
            <DueMapWidget />
            <CompactFuelWidget />
            <CompactDocumentsWidget />
          </div>
        ) : (
          /* Desktop: 60/40 split */
          <div className="grid grid-cols-5 gap-4">
            {/* Zone B: Main (3/5 = 60%) */}
            <div className="col-span-3 space-y-4">
              <WeekCalendarWidget />
              <DueMapWidget />
            </div>

            {/* Zone C: Sidebar (2/5 = 40%) */}
            <div className="col-span-2 space-y-3">
              <TodayCockpitWidget />
              <LeadsWidget />
              <CompactFuelWidget />
              <CompactDocumentsWidget />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
