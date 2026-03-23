import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { Calendar, Users, Heart, FileText, Package, BarChart3, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHero, KpiGrid, QuickActionBar, SectionHeader } from "@/components/dashboard-zones";

function getStallType(): string {
  return sessionStorage.getItem("hm_demo_stall_type") || "pension";
}

function getStallTypeLabel(): string {
  const labels: Record<string, string> = { pension: "Pensionsbetrieb", schule: "Schulbetrieb", misch: "Mischbetrieb", zucht: "Zuchtbetrieb" };
  return labels[getStallType()] || "Stallbetrieb";
}

const STALL_STATS: Record<string, { icon: any; label: string; value: string; sub?: string; highlight?: boolean }[]> = {
  pension: [
    { icon: Warehouse, label: "Boxen", value: "18/24", sub: "belegt", highlight: true },
    { icon: Users, label: "Einsteller", value: "22" },
    { icon: Heart, label: "Pferde", value: "26" },
    { icon: FileText, label: "Rechnungen", value: "4", sub: "offen" },
  ],
  schule: [
    { icon: Heart, label: "Schulpferde", value: "12", highlight: true },
    { icon: Users, label: "Reitschüler", value: "48" },
    { icon: Calendar, label: "Kurse/Woche", value: "16" },
    { icon: FileText, label: "Rechnungen", value: "6", sub: "offen" },
  ],
  misch: [
    { icon: Warehouse, label: "Boxen", value: "22/30", highlight: true },
    { icon: Users, label: "Einsteller", value: "56" },
    { icon: Heart, label: "Pferde", value: "34" },
    { icon: Calendar, label: "Kurse/Woche", value: "8" },
  ],
  zucht: [
    { icon: Heart, label: "Zuchtstuten", value: "8", highlight: true },
    { icon: Heart, label: "Fohlen", value: "5" },
    { icon: Calendar, label: "Decksprünge", value: "12" },
    { icon: FileText, label: "Verkäufe", value: "3", sub: "offen" },
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
  const stats = STALL_STATS[stallType] || STALL_STATS.pension;

  return (
    <div className="space-y-4">
      {/* ZONE 1 — Hero */}
      <DashboardHero subtitle={`${getStallTypeLabel()} – Dashboard`}>
        <QuickActionBar actions={[
          { key: "pferde", label: "Pferde", icon: Heart, primary: true, onClick: () => navigate("/stall/pferde") },
          { key: "einsteller", label: "Einsteller", icon: Users, onClick: () => navigate("/stall/boarders") },
          { key: "kalender", label: "Kalender", icon: Calendar, onClick: () => navigate("/stall/kalender") },
        ]} />
      </DashboardHero>

      {/* ZONE 2 — KPI Grid */}
      <KpiGrid columns={4} items={stats} />

      {/* ZONE 3 — Today's Schedule */}
      <div>
        <SectionHeader title="Heute" linkLabel="Kalender" onLinkClick={() => navigate("/stall/kalender")} />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {UPCOMING_EVENTS.map((event, i) => (
            <div key={i} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
              <span className="text-xs font-mono text-muted-foreground w-11">{event.time}</span>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                event.type === "appointment" ? "bg-blue-500" : event.type === "lead" ? "bg-green-500" : "bg-muted-foreground/40"
              }`} />
              <span className="text-sm text-foreground">{event.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <SectionHeader title="Verwaltung" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Lager & Futter", icon: Package, path: "/stall/lager", color: "text-amber-600 bg-amber-500/10" },
            { label: "Rechnungen", icon: FileText, path: "/stall/rechnungen", color: "text-orange-600 bg-orange-500/10" },
            { label: "Berichte", icon: BarChart3, path: "/stall/reports", color: "text-emerald-600 bg-emerald-500/10" },
            { label: "Stall-Experten", icon: Users, path: "/stall/experts", color: "text-purple-600 bg-purple-500/10" },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center`}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
