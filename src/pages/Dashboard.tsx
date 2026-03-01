import { Users, Calendar, TrendingUp, MessageSquare, Loader2, Compass } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCustomers } from "@/components/dashboard/RecentCustomers";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { OverdueAssessmentsWidget } from "@/components/dashboard/OverdueAssessmentsWidget";
import { DueAppointmentsWidget } from "@/components/dashboard/DueAppointmentsWidget";
import { SmartTourSuggestionWidget } from "@/components/dashboard/SmartTourSuggestionWidget";
import { RecentHorsesWidget } from "@/components/dashboard/RecentHorsesWidget";
import { ShareInviteLinkCard } from "@/components/invite/ShareInviteLinkCard";
import { FirstStepsChecklist } from "@/components/dashboard/FirstStepsChecklist";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ProviderSetupWizard } from "@/components/onboarding/ProviderSetupWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DemoCalendarEntry } from "@/components/demo/DemoCalendarEntry";
import { useTour } from "@/components/tour/TourContext";
import { Button } from "@/components/ui/button";
import { FeatureDiscoveryHint } from "@/components/growth/FeatureDiscoveryHint";
import { MilestoneCelebration } from "@/components/growth/MilestoneCelebration";
import { SocialProofWidget } from "@/components/growth/SocialProofWidget";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { data: stats, isLoading } = useDashboardStats();
  const { startTour } = useTour();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hufbearbeiter";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <>
      {/* Provider Onboarding - Setup Wizard */}
      {showOnboarding && (
        <ProviderSetupWizard onComplete={completeOnboarding} />
      )}

      <div className="space-y-6">
      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* Demo Account Calendar Entry */}
      <DemoCalendarEntry />

      {/* Growth: Milestone Celebrations */}
      <MilestoneCelebration />

      {/* Growth: Feature Discovery */}
      <FeatureDiscoveryHint />

      {/* Growth: Social Proof */}
      <SocialProofWidget />

      {/* First Steps Checklist */}
      <div data-tour="checklist">
        <FirstStepsChecklist />
      </div>

      {/* Recent Horses Quick Access */}
      <div data-tour="recent-horses">
        <RecentHorsesWidget />
      </div>

      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tagesübersicht
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTour('dashboard')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Compass className="h-4 w-4" />
            Führung starten
          </Button>
          <div className="lg:w-80" data-tour="invite-link">
            <ShareInviteLinkCard />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div data-tour="stats-grid">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Aktive Kunden"
            value={stats?.activeClients || 0}
            change={stats?.activeClientsChange || "0 aktiv"}
            changeType="neutral"
            icon={Users}
            iconColor="primary"
            navigateTo="/customers"
          />
          <StatCard
            title="Termine diese Woche"
            value={stats?.appointmentsThisWeek || 0}
            change={`${stats?.appointmentsToday || 0} heute`}
            changeType="neutral"
            icon={Calendar}
            iconColor="accent"
            navigateTo="/calendar"
          />
          <StatCard
            title="Neue Anfragen"
            value={stats?.newLeads || 0}
            change={stats?.unreadLeads ? `${stats.unreadLeads} ungelesen` : "Keine neuen"}
            changeType={stats?.unreadLeads ? "positive" : "neutral"}
            icon={MessageSquare}
            iconColor="primary"
            navigateTo="/anfragen"
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
          />
        </div>
      )}
      </div>

      {/* Due Appointments */}
      <div data-tour="due-appointments">
        <DueAppointmentsWidget />
      </div>

      {/* Smart Tour Suggestions */}
      <SmartTourSuggestionWidget />

      {/* Overdue Assessments */}
      <OverdueAssessmentsWidget />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments />
        <RecentCustomers />
      </div>
      </div>
    </>
  );
};

export default Dashboard;
