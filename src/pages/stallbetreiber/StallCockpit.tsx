import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { SectionHeader, KpiGrid } from "@/components/dashboard-zones";
import { Calendar, Heart, Clock, AlertTriangle, Loader2, CheckCircle } from "lucide-react";

export default function StallCockpit() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: horses = [], isLoading: horsesLoading } = useQuery({
    queryKey: ["stall-cockpit-horses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, last_appointment_date")
        .eq("owner_id", user!.id)
        .is("deleted_at", null)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: todayAppts = [] } = useQuery({
    queryKey: ["stall-cockpit-today", user?.id, today],
    queryFn: async () => {
      if (!horses.length) return [];
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, horses(name), profiles!appointments_provider_id_fkey(full_name)")
        .in("horse_id", horses.map(h => h.id))
        .eq("date", today)
        .order("time");
      return data ?? [];
    },
    enabled: !!user && horses.length > 0,
  });

  const completedToday = todayAppts.filter((a: any) => a.status === "completed").length;
  const pendingToday = todayAppts.filter((a: any) => a.status !== "completed" && a.status !== "cancelled").length;

  // Horses without recent appointments (>60 days)
  const overdueHorses = horses.filter((h: any) => {
    if (!h.last_appointment_date) return true;
    const daysSince = Math.floor((Date.now() - new Date(h.last_appointment_date).getTime()) / 86400000);
    return daysSince > 60;
  });

  const stats = [
    { icon: Calendar, label: "Heute", value: todayAppts.length, sub: `${completedToday} erledigt`, highlight: true },
    { icon: Heart, label: "Pferde", value: horses.length, sub: "im Stall" },
    { icon: Clock, label: "Ausstehend", value: pendingToday, sub: "heute offen" },
    { icon: AlertTriangle, label: "Überfällig", value: overdueHorses.length, sub: ">60 Tage", warning: overdueHorses.length > 0 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Tages-Cockpit</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
      </div>

      <KpiGrid columns={4} items={stats} />

      {/* Today's schedule */}
      <div>
        <SectionHeader title="Heutige Termine" />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {horsesLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : todayAppts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Termine heute</p>
            </div>
          ) : (
            todayAppts.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-3 p-3">
                <span className="text-xs font-mono text-muted-foreground w-11">{appt.time?.slice(0, 5) || "–"}</span>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${appt.status === "completed" ? "bg-green-500" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{(appt.horses as any)?.name || "Termin"}</p>
                  <p className="text-xs text-muted-foreground">{(appt.profiles as any)?.full_name || appt.service_type || ""}</p>
                </div>
                {appt.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overdue horses */}
      {overdueHorses.length > 0 && (
        <div>
          <SectionHeader title="Termin überfällig" />
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {overdueHorses.map((horse: any) => (
              <div key={horse.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{horse.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {horse.last_appointment_date
                      ? `Letzter Termin: ${format(new Date(horse.last_appointment_date), "d. MMM yyyy", { locale: de })}`
                      : "Noch kein Termin"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
