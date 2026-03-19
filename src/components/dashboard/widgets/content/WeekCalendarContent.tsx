import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import type { WidgetContentProps } from "./types";

export default function WeekCalendarContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      case "completed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "overdue": return "bg-destructive/20 text-destructive border-destructive/30";
      case "confirmed": return "bg-primary/15 text-primary border-primary/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  const navigateDay = (dir: number) => {
    if (isMobile) {
      setCurrentDate(addDays(currentDate, dir));
    } else {
      setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => navigateDay(1),
    onSwipeRight: () => navigateDay(-1),
  });

  const selectedDayAppts = getApptsForDay(currentDate);

  if (isMobile) {
    return (
      <div className="space-y-2" {...swipeHandlers}>
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {format(currentDate, "EEEE, d. MMM", { locale: de })}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setCurrentDate(new Date())}>
              Heute
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Day strip */}
        <div className="flex gap-1">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, currentDate);
            const hasAppts = getApptsForDay(day).length > 0;
            return (
              <button
                key={day.toISOString()}
                onClick={() => setCurrentDate(day)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-center transition-colors relative",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <p className="text-[9px] uppercase">{format(day, "EE", { locale: de })}</p>
                <p className="text-xs font-bold">{format(day, "d")}</p>
                {hasAppts && !isSelected && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Appointment list */}
        <div className="min-h-[120px]">
          {selectedDayAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Keine Termine</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedDayAppts.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => navigate("/calendar")}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors",
                    getStatusColor(apt.status)
                  )}
                >
                  {apt.time && (
                    <span className="flex items-center gap-1 text-xs font-mono opacity-75 shrink-0">
                      <Clock className="h-3 w-3" />
                      {apt.time.slice(0, 5)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{apt.horse_name}</p>
                    {apt.service_type && (
                      <p className="text-[10px] opacity-70 truncate">{apt.service_type}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick action */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-primary"
            onClick={() => navigate("/calendar")}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Termin hinzufügen
          </Button>
        </div>
      </div>
    );
  }

  // Desktop: compact week overview (no hour grid)
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

      {/* Compact week grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayAppts = getApptsForDay(day);
          return (
            <div key={day.toISOString()} className={cn("min-h-[80px] p-1 rounded", isToday && "bg-primary/5")}>
              <div className="text-center mb-1">
                <p className="text-[9px] uppercase text-muted-foreground">{format(day, "EEE", { locale: de })}</p>
                <p className={cn("text-xs font-bold", isToday ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => navigate("/calendar")}
                    className={cn(
                      "w-full text-left px-1 py-0.5 rounded text-[9px] border truncate",
                      getStatusColor(apt.status)
                    )}
                  >
                    {apt.horse_name}
                  </button>
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-[8px] text-muted-foreground text-center">+{dayAppts.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => navigate("/calendar")}>
          <CalendarPlus className="h-3 w-3" />
          Termin hinzufügen
        </Button>
      </div>
    </div>
  );
}
