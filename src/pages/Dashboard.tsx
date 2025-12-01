import { Users, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCustomers } from "@/components/dashboard/RecentCustomers";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Willkommen zurück, Max!</h1>
        <p className="text-muted-foreground mt-1">
          Hier ist ein Überblick über Ihr Geschäft heute.
        </p>
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
        />
        <StatCard
          title="Termine diese Woche"
          value={12}
          change="2 heute"
          changeType="neutral"
          icon={Calendar}
          iconColor="accent"
        />
        <StatCard
          title="Neue Anfragen"
          value={3}
          change="1 ungelesen"
          changeType="positive"
          icon={MessageSquare}
          iconColor="primary"
        />
        <StatCard
          title="Umsatz (Monat)"
          value="€4.250"
          change="+12% vs. Vormonat"
          changeType="positive"
          icon={TrendingUp}
          iconColor="accent"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments />
        <RecentCustomers />
      </div>
    </div>
  );
};

export default Dashboard;
