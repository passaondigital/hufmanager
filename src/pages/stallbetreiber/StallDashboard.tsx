import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { Calendar, Users, Heart, FileText, Package, BarChart3, ClipboardList, Warehouse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

function getStallType(): string {
  return sessionStorage.getItem("hm_demo_stall_type") || "pension";
}

function getStallTypeLabel(): string {
  const labels: Record<string, string> = {
    pension: "Pensionsbetrieb",
    schule: "Schulbetrieb",
    misch: "Mischbetrieb",
    zucht: "Zuchtbetrieb",
  };
  return labels[getStallType()] || "Stallbetrieb";
}

const STALL_STATS = {
  pension: [
    { label: "Boxen belegt", value: "18/24", icon: Warehouse, color: "text-amber-600" },
    { label: "Einsteller", value: "22", icon: Users, color: "text-blue-500" },
    { label: "Pferde", value: "26", icon: Heart, color: "text-pink-500" },
    { label: "Offene Rechnungen", value: "4", icon: FileText, color: "text-orange-500" },
  ],
  schule: [
    { label: "Schulpferde", value: "12", icon: Heart, color: "text-pink-500" },
    { label: "Reitschüler", value: "48", icon: Users, color: "text-blue-500" },
    { label: "Kurse diese Woche", value: "16", icon: Calendar, color: "text-green-500" },
    { label: "Offene Rechnungen", value: "6", icon: FileText, color: "text-orange-500" },
  ],
  misch: [
    { label: "Boxen belegt", value: "22/30", icon: Warehouse, color: "text-amber-600" },
    { label: "Einsteller + Schüler", value: "56", icon: Users, color: "text-blue-500" },
    { label: "Pferde gesamt", value: "34", icon: Heart, color: "text-pink-500" },
    { label: "Kurse diese Woche", value: "8", icon: Calendar, color: "text-green-500" },
  ],
  zucht: [
    { label: "Zuchtstuten", value: "8", icon: Heart, color: "text-pink-500" },
    { label: "Fohlen", value: "5", icon: Heart, color: "text-amber-500" },
    { label: "Decksprünge", value: "12", icon: ClipboardList, color: "text-blue-500" },
    { label: "Verkäufe offen", value: "3", icon: FileText, color: "text-orange-500" },
  ],
};

const UPCOMING_EVENTS = [
  { time: "08:00", title: "Fütterung – Morgenrunde", type: "routine" },
  { time: "09:30", title: "Schmied – Stall B (4 Pferde)", type: "appointment" },
  { time: "11:00", title: "Besichtigung – Neuer Einsteller", type: "lead" },
  { time: "14:00", title: "Tierarzt – Impftermin Paddock 2", type: "appointment" },
  { time: "16:30", title: "Fütterung – Abendrunde", type: "routine" },
];

export default function StallDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stallType = getStallType();
  const stats = STALL_STATS[stallType as keyof typeof STALL_STATS] || STALL_STATS.pension;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          🏇 {getStallTypeLabel()} – Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Willkommen zurück! Hier ist dein Überblick für heute.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Today's Schedule */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Heute
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/stall/kalender")} className="text-xs">
                Kalender öffnen →
              </Button>
            </div>
            <div className="space-y-2">
              {UPCOMING_EVENTS.map((event, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-12">{event.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    event.type === "appointment" ? "bg-blue-500" :
                    event.type === "lead" ? "bg-green-500" : "bg-muted-foreground"
                  }`} />
                  <span className="text-sm text-foreground">{event.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Einsteller", icon: Users, path: "/stall/boarders", color: "bg-blue-500/10 text-blue-600" },
              { label: "Pferde", icon: Heart, path: "/stall/pferde", color: "bg-pink-500/10 text-pink-600" },
              { label: "Lager & Futter", icon: Package, path: "/stall/lager", color: "bg-amber-500/10 text-amber-600" },
              { label: "Rechnungen", icon: FileText, path: "/stall/rechnungen", color: "bg-orange-500/10 text-orange-600" },
              { label: "Berichte", icon: BarChart3, path: "/stall/reports", color: "bg-emerald-500/10 text-emerald-600" },
              { label: "Stall-Experten", icon: Users, path: "/stall/experts", color: "bg-purple-500/10 text-purple-600" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <DashboardSidebar variant="provider" />
        </div>
      </div>
    </div>
  );
}
