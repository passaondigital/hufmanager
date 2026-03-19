import { useState, useRef } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isSameMonth, addDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

const EmployeeCalendar = () => {
  const { data: profile } = useEmployeeProfile();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"week" | "month">(isMobile ? "month" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Swipe handling
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
      if (view === "week") {
        setCurrentDate(dx > 0 ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
      } else {
        setCurrentDate(dx > 0 ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
      }
    }
  };

  const rangeStart = view === "week"
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);
  const rangeEnd = view === "week"
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  const { data: assignments = [] } = useQuery({
    queryKey: ["employee-calendar", profile?.id, format(rangeStart, "yyyy-MM-dd"), format(rangeEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("employee_assignments")
        .select(`*, appointment:appointments(id, date, time, status, location, horse:horses(name), client:profiles!appointments_client_id_fkey(full_name))`)
        .eq("employee_id", profile.id)
        .gte("created_at", rangeStart.toISOString())
        .order("created_at");
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: absences = [] } = useQuery({
    queryKey: ["employee-absences-cal", profile?.id, format(rangeStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("employee_absence_requests")
        .select("*")
        .eq("employee_id", profile.id)
        .in("status", ["pending", "approved"])
        .gte("end_date", format(rangeStart, "yyyy-MM-dd"))
        .lte("start_date", format(rangeEnd, "yyyy-MM-dd"));
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const getAssignmentsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return assignments.filter((a: any) => a.appointment?.date === dayStr);
  };

  const getAbsenceForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return absences.find((a: any) => a.start_date <= dayStr && a.end_date >= dayStr);
  };

  const navigate = (dir: number) => {
    if (view === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const dayAssignments = selectedDay ? getAssignmentsForDay(selectedDay) : [];

  // Mobile day list for week view
  const mobileDayList = isMobile && view === "week";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Kalender
          <HelpTip id="mitarbeiter.kalender" />
        </h1>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="text-xs px-3">Woche</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3">Monat</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button className="font-semibold text-sm" onClick={() => setCurrentDate(new Date())}>
          {view === "week"
            ? `${format(rangeStart, "d. MMM", { locale: de })} – ${format(rangeEnd, "d. MMM yyyy", { locale: de })}`
            : format(currentDate, "MMMM yyyy", { locale: de })}
        </button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Week View: Day strip + list */}
      {mobileDayList ? (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* Day strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {days.map((day) => {
              const isActive = selectedDay && isSameDay(day, selectedDay);
              const isTodayDay = isSameDay(day, new Date());
              const dayAssigns = getAssignmentsForDay(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex flex-col items-center min-w-[48px] py-2 px-2 rounded-xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isTodayDay
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-[10px] uppercase font-medium">{format(day, "EE", { locale: de })}</span>
                  <span className={cn("text-lg font-bold", isActive ? "" : "text-foreground")}>{format(day, "d")}</span>
                  {dayAssigns.length > 0 && !isActive && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <Card className="mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{format(selectedDay, "EEEE, d. MMMM", { locale: de })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Keine Termine</p>
                ) : (
                  dayAssignments.map((a: any) => {
                    const isDone = a.status === "checked_out" || a.status === "completed";
                    return (
                      <div key={a.id} className={cn("p-3 rounded-lg border text-sm", isDone ? "bg-primary/5 border-primary/20" : "")}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{a.appointment?.horse?.name}</span>
                          {isDone && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{a.appointment?.client?.full_name}</p>
                        {a.appointment?.time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />{a.appointment.time.substring(0, 5)} Uhr
                          </div>
                        )}
                        {a.appointment?.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" /><span className="truncate">{a.appointment.location}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2">← Wischen für Wochenwechsel →</p>
        </div>
      ) : null}

      {/* Desktop Week View */}
      {!mobileDayList && view === "week" && (
        <Card onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <CardContent className="p-2 overflow-x-auto">
            <div className="grid grid-cols-8 min-w-[600px]">
              <div className="border-r border-border">
                <div className="h-10" />
                {HOURS.map((h) => (
                  <div key={h} className="h-12 text-[10px] text-muted-foreground pr-2 text-right flex items-start justify-end pt-0.5">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {days.map((day) => {
                const dayAssigns = getAssignmentsForDay(day);
                const absence = getAbsenceForDay(day);
                const isTodayDay = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="border-r border-border last:border-r-0 relative">
                    <button
                      onClick={() => setSelectedDay(day)}
                      className={cn("h-10 w-full text-center text-xs font-medium flex flex-col items-center justify-center border-b border-border", isTodayDay && "bg-primary/10 text-primary")}
                    >
                      <span>{format(day, "EE", { locale: de })}</span>
                      <span className="text-[10px]">{format(day, "dd")}</span>
                    </button>
                    <div className="relative">
                      {HOURS.map((h) => (
                        <div key={h} className="h-12 border-b border-border/30" />
                      ))}
                      {absence && (
                        <div className={cn(
                          "absolute inset-x-0.5 top-0 bottom-0 rounded opacity-20",
                          absence.status === "approved" ? "bg-muted-foreground" : "bg-muted-foreground/50 border border-dashed border-muted-foreground"
                        )} />
                      )}
                      {dayAssigns.map((a: any) => {
                        const time = a.appointment?.time;
                        if (!time) return null;
                        const hour = parseInt(time.split(":")[0]);
                        const min = parseInt(time.split(":")[1] || "0");
                        const top = (hour - 8) * 48 + (min / 60) * 48;
                        const isDone = a.status === "checked_out" || a.status === "completed";
                        return (
                          <div
                            key={a.id}
                            className={cn(
                              "absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[9px] leading-tight cursor-pointer active:scale-[0.97]",
                              isDone ? "bg-primary/20 text-primary" : a.status === "checked_in" || a.status === "working" ? "bg-amber-500/20 text-amber-700" : "bg-muted text-muted-foreground"
                            )}
                            style={{ top: `${top}px`, height: "44px" }}
                            onClick={() => setSelectedDay(day)}
                          >
                            <span className="font-medium truncate block">{a.appointment?.horse?.name}</span>
                            <span className="truncate block">{time.substring(0, 5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {view === "month" && (
        <Card onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground pb-1">{d}</div>
              ))}
              {days.map((day) => {
                const dayAssigns = getAssignmentsForDay(day);
                const absence = getAbsenceForDay(day);
                const isTodayDay = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const doneCount = dayAssigns.filter((a: any) => a.status === "checked_out").length;
                const openCount = dayAssigns.length - doneCount;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-colors min-h-[44px]",
                      isTodayDay && "bg-primary/10 border border-primary/30 font-bold text-primary",
                      !isCurrentMonth && "opacity-40",
                      selectedDay && isSameDay(day, selectedDay) && "ring-2 ring-primary",
                      absence && "bg-muted"
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {(doneCount > 0 || openCount > 0) && (
                      <div className="flex gap-0.5 mt-0.5">
                        {doneCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        {openCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {isMobile && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">← Wischen für Monatswechsel →</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected day detail (for month view + desktop week) */}
      {!mobileDayList && selectedDay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {format(selectedDay, "EEEE, d. MMMM", { locale: de })}
              {dayAssignments.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{dayAssignments.length} Termine</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine Termine an diesem Tag</p>
            ) : (
              dayAssignments.map((a: any) => {
                const isDone = a.status === "checked_out" || a.status === "completed";
                return (
                  <div key={a.id} className={cn("p-3 rounded-lg border text-sm", isDone ? "bg-primary/5 border-primary/20" : "")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{a.appointment?.horse?.name}</span>
                      {isDone && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.appointment?.client?.full_name}</p>
                    {a.appointment?.time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />{a.appointment.time.substring(0, 5)} Uhr
                      </div>
                    )}
                    {a.appointment?.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" /><span className="truncate">{a.appointment.location}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeCalendar;
