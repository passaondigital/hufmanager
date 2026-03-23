import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/dashboard-zones";

export default function StallKalender() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["stall-calendar", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data: horses } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", user!.id)
        .is("deleted_at", null);

      if (!horses?.length) return [];
      const horseIds = horses.map(h => h.id);

      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, location, service_type, notes, horses(name), profiles!appointments_provider_id_fkey(full_name, business_name)")
        .in("horse_id", horseIds)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date")
        .order("time");
      return data ?? [];
    },
    enabled: !!user,
  });

  const dayAppointments = appointments.filter((a: any) => a.date === format(selectedDay, "yyyy-MM-dd"));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stallkalender</h1>
      </div>

      {/* Week strip */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex gap-1">
          {days.map(day => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDay);
            const dayAppts = appointments.filter((a: any) => a.date === format(day, "yyyy-MM-dd"));
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 rounded-lg text-xs transition-all",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  isToday && !isSelected && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span className="text-[10px] uppercase">{format(day, "EE", { locale: de })}</span>
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                {dayAppts.length > 0 && (
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", isSelected ? "bg-primary-foreground" : "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day view */}
      <div>
        <SectionHeader title={format(selectedDay, "EEEE, d. MMMM", { locale: de })} />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : dayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
            </div>
          ) : (
            dayAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-3 p-3">
                <span className="text-xs font-mono text-muted-foreground w-11">{appt.time?.slice(0, 5) || "–"}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", appt.status === "completed" ? "bg-green-500" : "bg-primary")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{(appt.horses as any)?.name || "Termin"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {(appt.profiles as any)?.business_name && <span>{(appt.profiles as any).business_name}</span>}
                    {appt.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{appt.location}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
