import { Users, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCustomers } from "@/components/dashboard/RecentCustomers";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { OverdueAssessmentsWidget } from "@/components/dashboard/OverdueAssessmentsWidget";
import { ShareInviteLinkCard } from "@/components/invite/ShareInviteLinkCard";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hufbearbeiter";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aktive Kunden"
          value={47}
          change="+3 diesen Monat"
          changeType="positive"
          icon={Users}
          iconColor="primary"
          navigateTo="/customers"
        />
        <StatCard
          title="Termine diese Woche"
          value={12}
          change="2 heute"
          changeType="neutral"
          icon={Calendar}
          iconColor="accent"
          navigateTo="/calendar"
        />
        <StatCard
          title="Neue Anfragen"
          value={3}
          change="1 ungelesen"
          changeType="positive"
          icon={MessageSquare}
          iconColor="primary"
          navigateTo="/anfragen"
        />
        <StatCard
          title="Umsatz (Monat)"
          value="€4.250"
          change="+12% vs. Vormonat"
          changeType="positive"
          icon={TrendingUp}
          iconColor="accent"
          navigateTo="/analyse"
        />
      </div>

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
