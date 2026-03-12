import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { WidgetContentProps } from "./types";

export default function WeekCalendarContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: appointments = [] } = useQuery({
    queryKey: ["widget-week-cal", user?.id, format(weekStart, "yyyy-MM-dd")],
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
        horse_name: a.horses?.name || "–",
        service_type: a.service_type,
      }));
    },
    enabled: !!user?.id,
  });

  const getApptsForDay = (day: Date) =>
    appointments.filter((a) => a.date === format(day, "yyyy-MM-dd"));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "overdue": return "bg-destructive/20 text-destructive border-destructive/30";
      case "confirmed": return "bg-primary/15 text-primary border-primary/30";
      default: return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
  };

  // Build time slots 6:00-20:00
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);

  return (
    <div className="space-y-2">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          KW {format(weekStart, "w")} · {format(weekStart, "d. MMM", { locale: de })} – {format(weekEnd, "d. MMM", { locale: de })}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setCurrentDate(new Date())}>
            Heute
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-0">
        <div />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE", { locale: de })}
              </p>
              <p className={cn("text-xs font-bold", isToday ? "text-primary" : "text-foreground")}>
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-0 max-h-[300px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="text-[9px] text-muted-foreground text-right pr-1.5 py-2 border-t border-border/30">
              {`${hour}:00`}
            </div>
            {days.map((day) => {
              const dayAppts = getApptsForDay(day).filter((a) => {
                if (!a.time) return hour === 8;
                const h = parseInt(a.time.split(":")[0], 10);
                return h === hour;
              });
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    "min-h-[28px] border-t border-border/20 px-0.5",
                    isToday && "bg-primary/5"
                  )}
                >
                  {dayAppts.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => navigate("/calendar")}
                      className={cn(
                        "w-full text-left px-1 py-0.5 rounded text-[9px] border mb-0.5 truncate",
                        getStatusColor(apt.status)
                      )}
                    >
                      {apt.horse_name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick action */}
      <div className="flex justify-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-primary"
          onClick={() => navigate("/calendar")}
        >
          <CalendarPlus className="h-3 w-3" />
          Termin hinzufügen
        </Button>
      </div>
    </div>
  );
}
