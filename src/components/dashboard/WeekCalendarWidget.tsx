import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  status: string;
  horse_name?: string;
  service_type?: string | null;
}

export function WeekCalendarWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: appointments = [] } = useQuery({
    queryKey: ["week-calendar", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, horses(name)")
        .eq("provider_id", user!.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled")
        .order("time", { ascending: true });

      return (data || []).map((a: any) => ({
        id: a.id,
        date: a.date,
        time: a.time,
        status: a.status,
        horse_name: a.horses?.name || "Unbenannt",
        service_type: a.service_type,
      }));
    },
    enabled: !!user?.id,
  });

  // On mobile: show single day
  const days = isMobile
    ? [currentDate]
    : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => a.date === format(day, "yyyy-MM-dd"));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "overdue": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-primary/15 text-primary border-primary/30";
    }
  };

  const navigateWeek = (dir: number) => {
    if (isMobile) {
      setCurrentDate(addDays(currentDate, dir));
    } else {
      setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isMobile
            ? format(currentDate, "EEEE, d. MMM", { locale: de })
            : `KW ${format(weekStart, "w")} · ${format(weekStart, "d. MMM", { locale: de })} – ${format(weekEnd, "d. MMM", { locale: de })}`
          }
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Heute
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {isMobile ? (
        /* Mobile: Day view */
        <div className="p-3 min-h-[280px]">
          {(() => {
            const dayAppts = getAppointmentsForDay(currentDate);
            if (dayAppts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
                  <p className="text-sm">Keine Termine</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-1 text-xs text-primary"
                    onClick={() => navigate("/calendar")}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Termin hinzufügen
                  </Button>
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {dayAppts.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => navigate("/calendar")}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md border text-sm transition-colors",
                      getStatusColor(apt.status)
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{apt.horse_name}</span>
                      {apt.time && (
                        <span className="text-xs opacity-75">{apt.time?.slice(0, 5)}</span>
                      )}
                    </div>
                    {apt.service_type && (
                      <p className="text-xs opacity-70 mt-0.5">{apt.service_type}</p>
                    )}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        /* Desktop: Week view */
        <div className="grid grid-cols-7 divide-x divide-border">
          {days.map((day) => {
            const dayAppts = getAppointmentsForDay(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[320px] p-2",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Day header */}
                <div className="text-center mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(day, "EEE", { locale: de })}
                  </p>
                  <p className={cn(
                    "text-sm font-bold mt-0.5",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </p>
                </div>

                {/* Appointments */}
                <div className="space-y-1">
                  {dayAppts.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => navigate("/calendar")}
                      className={cn(
                        "w-full text-left p-1.5 rounded text-[11px] border transition-colors hover:opacity-80",
                        getStatusColor(apt.status)
                      )}
                    >
                      {apt.time && (
                        <span className="font-mono text-[10px] opacity-70">{apt.time?.slice(0, 5)} </span>
                      )}
                      <span className="font-medium">{apt.horse_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
