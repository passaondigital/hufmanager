import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalCalendar() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const isMobile = useIsMobile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Load appointments linked to this org
  const { data: appointments = [] } = useQuery({
    queryKey: ["portal-appointments", org.id, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, horse_id, horses(name), location, notes")
        .eq("organization_id", org.id)
        .gte("date", start)
        .lte("date", end)
        .order("date")
        .order("time");
      return data ?? [];
    },
  });

  // Swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setCurrentMonth(subMonths(currentMonth, 1));
      else setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const mobileWeekStart = startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 });
  const mobileWeekDays = eachDayOfInterval({
    start: mobileWeekStart,
    end: endOfWeek(mobileWeekStart, { weekStartsOn: 1 }),
  });

  const getAppointmentsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return appointments.filter((a: any) => a.date === dateStr);
  };

  const selectedDayAppts = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const renderDayEvents = (appts: any[]) => {
    if (appts.length === 0) {
      return (
        <div className="text-center py-8">
          <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {appts.map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs font-mono text-muted-foreground w-11">{a.time?.slice(0, 5) || "–"}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{(a.horses as any)?.name || "Termin"}</p>
              {a.location && <p className="text-xs text-muted-foreground truncate">{a.location}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Kalender
        </h1>
        <Button size={isMobile ? "sm" : "default"} className="gap-1.5">
          <Plus className="h-4 w-4" /> {isMobile ? "Neu" : "Neuer Termin"}
        </Button>
      </div>

      {isMobile ? (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button className="font-semibold text-sm" onClick={() => setCurrentMonth(new Date())}>
              {format(currentMonth, "MMMM yyyy", { locale: de })}
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {mobileWeekDays.map((day) => {
              const isActive = selectedDate && isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const hasEvents = getAppointmentsForDay(day).length > 0;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center min-w-[48px] py-2 px-2 rounded-xl transition-all relative",
                    isActive ? "bg-primary text-primary-foreground shadow-sm"
                      : isTodayDay ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-[10px] uppercase font-medium">{format(day, "EE", { locale: de })}</span>
                  <span className={cn("text-lg font-bold", isActive ? "" : "text-foreground")}>{format(day, "d")}</span>
                  {hasEvents && <div className={cn("w-1 h-1 rounded-full mt-0.5", isActive ? "bg-primary-foreground" : "bg-primary")} />}
                </button>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDate ? format(selectedDate, "EEEE, d. MMMM", { locale: de }) : "Tag auswählen"}
              </CardTitle>
            </CardHeader>
            <CardContent>{renderDayEvents(selectedDayAppts)}</CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy", { locale: de })}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="grid grid-cols-7 gap-px">
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {days.map(day => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const hasEvents = getAppointmentsForDay(day).length > 0;
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative p-1.5 min-h-[56px] md:min-h-[72px] text-sm rounded-lg transition-colors text-left",
                        !isSameMonth(day, currentMonth) ? "text-muted-foreground/40" : "text-foreground",
                        isToday(day) ? "bg-primary/10 font-bold" : "",
                        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xs">{format(day, "d")}</span>
                      {hasEvents && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, dd. MMMM", { locale: de }) : "Tag auswählen"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">Klicke auf einen Tag</p>
              ) : renderDayEvents(selectedDayAppts)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
