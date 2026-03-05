import { Users, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { DueAppointmentsWidget } from "@/components/dashboard/DueAppointmentsWidget";
import { SmartTourSuggestionWidget } from "@/components/dashboard/SmartTourSuggestionWidget";
import { ShareInviteLinkCard } from "@/components/invite/ShareInviteLinkCard";
import { HufrenteWidget } from "@/components/dashboard/HufrenteWidget";
import { FuelPriceWidget } from "@/components/dashboard/FuelPriceWidget";
import { MonthlyFuelInsight } from "@/components/dashboard/MonthlyFuelInsight";
import { FirstStepsChecklist } from "@/components/dashboard/FirstStepsChecklist";
import { DashboardWelcomeHeader } from "@/components/dashboard/DashboardWelcomeHeader";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingAssistant } from "@/components/onboarding/OnboardingAssistant";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatGridSkeleton } from "@/components/ui/skeletons";
import { MilestoneCelebration } from "@/components/growth/MilestoneCelebration";
import { DemoTourButton } from "@/components/demo/DemoTourButton";
import { HelpTip } from "@/components/ui/HelpTip";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { data: stats, isLoading } = useDashboardStats();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hufbearbeiter";

  // Fetch readable_id for the welcome header
  const { data: profileData } = useQuery({
    queryKey: ["provider-profile-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("readable_id")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <>
      {/* Provider Onboarding - Setup Assistant */}
      {showOnboarding && (
        <OnboardingAssistant onComplete={completeOnboarding} />
      )}

      <div className="space-y-6 pb-4">
      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* Growth: Milestone Celebrations */}
      <MilestoneCelebration />

      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <DashboardWelcomeHeader
          fullName={displayName}
          readableId={profileData?.readable_id}
          subtitle="Tagesübersicht"
        />
        <div className="flex items-center gap-3">
          <DemoTourButton />
          <div className="lg:w-80" data-tour="invite-link">
            <ShareInviteLinkCard />
          </div>
        </div>
      </div>

      {/* 1. KPI Stats Grid */}
      <div data-tour="stats-grid">
      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Aktive Kunden"
            value={stats?.activeClients || 0}
            change={stats?.activeClientsChange || "0 aktiv"}
            changeType="neutral"
            icon={Users}
            iconColor="primary"
            navigateTo="/customers"
            helpTipId="dashboard.aktive-kunden"
          />
          <StatCard
            title="Termine diese Woche"
            value={stats?.appointmentsThisWeek || 0}
            change={`${stats?.appointmentsToday || 0} heute`}
            changeType="neutral"
            icon={Calendar}
            iconColor="accent"
            navigateTo="/calendar"
            helpTipId="dashboard.termine-woche"
          />
          <StatCard
            title="Neue Anfragen"
            value={stats?.newLeads || 0}
            change={stats?.unreadLeads ? `${stats.unreadLeads} ungelesen` : "Keine neuen"}
            changeType={stats?.unreadLeads ? "positive" : "neutral"}
            icon={MessageSquare}
            iconColor="primary"
            navigateTo="/anfragen"
            helpTipId="dashboard.neue-anfragen"
          />
          <StatCard
            title="Umsatz (Monat)"
            value={formatCurrency(stats?.monthlyRevenue || 0)}
            change={
              stats?.revenueChangePercent !== undefined
                ? `${stats.revenueChangePercent >= 0 ? "+" : ""}${stats.revenueChangePercent}% vs. Vormonat`
                : "Keine Daten"
            }
            changeType={
              stats?.revenueChangePercent !== undefined
                ? stats.revenueChangePercent > 0
                  ? "positive"
                  : stats.revenueChangePercent < 0
                  ? "negative"
                  : "neutral"
                : "neutral"
            }
            icon={TrendingUp}
            iconColor="accent"
            navigateTo="/rechnungen"
            helpTipId="dashboard.umsatz-monat"
          />
        </div>
      )}
      </div>

      {/* 2. Due Appointments */}
      <div data-tour="due-appointments" className="relative">
        <span className="absolute top-3 right-3 z-10"><HelpTip id="dashboard.faellige-termine" /></span>
        <DueAppointmentsWidget />
      </div>

      {/* 3. First Steps / Onboarding (only if not completed) */}
      <div data-tour="checklist" className="relative">
        <span className="absolute top-3 right-3 z-10"><HelpTip id="dashboard.erste-schritte" /></span>
        <FirstStepsChecklist />
      </div>

      {/* 4. Smart Tour Suggestions */}
      <div className="relative">
        <span className="absolute top-3 right-3 z-10"><HelpTip id="dashboard.tour-vorschlaege" /></span>
        <SmartTourSuggestionWidget />
      </div>

      {/* 5. Live Fuel Prices */}
      <div className="relative">
        <span className="absolute top-3 right-3 z-10"><HelpTip id="dashboard.spritpreise" /></span>
        <FuelPriceWidget />
      </div>

      {/* 5b. Monthly Fuel Insight */}
      <MonthlyFuelInsight />

      {/* 6. Hufrente (nice to have, bottom) */}
      <div className="relative">
        <span className="absolute top-3 right-3 z-10"><HelpTip id="dashboard.hufrente" /></span>
        <HufrenteWidget />
      </div>
      </div>
    </>
  );
};

export default Dashboard;
