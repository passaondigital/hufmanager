import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Heart, FileText, Package, BarChart3, Warehouse, Loader2 } from "lucide-react";
import { DashboardHero, KpiGrid, QuickActionBar, SectionHeader } from "@/components/dashboard-zones";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function StallDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  // Real horse count (owned by this user)
  const { data: horseCount = 0, isLoading: horsesLoading } = useQuery({
    queryKey: ["stall-horses-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("horses")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .is("deleted_at", null);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Real upcoming appointments count
  const { data: appointmentCount = 0 } = useQuery({
    queryKey: ["stall-appointments-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("client_id", user!.id)
        .gte("date", today)
        .in("status", ["scheduled", "confirmed", "planned"]);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Today's appointments (real data)
  const { data: todayAppointments = [], isLoading: todayLoading } = useQuery({
    queryKey: ["stall-today-appointments", user?.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, location, notes, service_type, horses(name)")
        .eq("client_id", user!.id)
        .eq("date", today)
        .order("time");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Completed count
  const { data: completedCount = 0 } = useQuery({
    queryKey: ["stall-completed", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("client_id", user!.id)
        .eq("status", "completed");
      return count ?? 0;
    },
    enabled: !!user,
  });

  const stats = [
    { icon: Heart, label: "Pferde", value: horseCount, sub: "im Stall", highlight: true },
    { icon: Calendar, label: "Termine", value: appointmentCount, sub: "anstehend" },
    { icon: FileText, label: "Erledigt", value: completedCount, sub: "gesamt" },
    { icon: Users, label: "Heute", value: todayAppointments.length, sub: todayAppointments.length === 1 ? "Termin" : "Termine" },
  ];

  return (
    <div className="space-y-4">
      {/* ZONE 1 — Hero */}
      <DashboardHero subtitle="Stallbetreiber – Dashboard">
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
          {todayLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Termine heute</p>
            </div>
          ) : (
            todayAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-11">{appt.time?.slice(0, 5) || "–"}</span>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  appt.status === "completed" ? "bg-green-500" : "bg-primary"
                }`} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground">{(appt.horses as any)?.name || appt.service_type || "Termin"}</span>
                  {appt.location && <p className="text-xs text-muted-foreground truncate">{appt.location}</p>}
                </div>
              </div>
            ))
          )}
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
