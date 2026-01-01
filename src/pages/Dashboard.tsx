import { Users, Calendar, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCustomers } from "@/components/dashboard/RecentCustomers";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { OverdueAssessmentsWidget } from "@/components/dashboard/OverdueAssessmentsWidget";
import { ShareInviteLinkCard } from "@/components/invite/ShareInviteLinkCard";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { data: stats, isLoading } = useDashboardStats();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hufbearbeiter";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <>
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={completeOnboarding}
          onSkip={completeOnboarding}
        />
      )}

      <div className="space-y-6">
      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Willkommen zurück, {displayName}!</h1>
          <p className="text-muted-foreground mt-1">
            Hier ist ein Überblick über Ihr Geschäft heute.
          </p>
        </div>
        <div className="lg:w-96">
          <ShareInviteLinkCard />
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 flex items-center justify-center h-32">
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

      {/* Smart Suggestions - Overdue Assessments */}
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
