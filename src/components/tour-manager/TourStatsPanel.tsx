import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BarChart3, Car, Clock, Users, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DayStats {
  date: Date;
  appointments: number;
  completedAppointments: number;
  totalMinutes: number;
  distanceKm: number;
}

interface WeekSummary {
  totalAppointments: number;
  completedAppointments: number;
  totalKm: number;
  totalMinutes: number;
  avgTimePerClient: number;
  days: DayStats[];
}

export function TourStatsPanel() {
  const { user } = useAuth();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: selectedWeekStart, end: weekEnd });

  // Navigate weeks
  const goToPrevWeek = () => setSelectedWeekStart(subWeeks(selectedWeekStart, 1));
  const goToNextWeek = () => setSelectedWeekStart(addWeeks(selectedWeekStart, 1));
  const goToCurrentWeek = () => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Fetch appointments for the week
  const { data: appointments = [] } = useQuery({
    queryKey: ["tour-stats-appointments", format(selectedWeekStart, "yyyy-MM-dd"), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, status, duration")
        .eq("provider_id", user.id)
        .gte("date", format(selectedWeekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch mileage logs for the week
  const { data: mileageLogs = [] } = useQuery({
    queryKey: ["tour-stats-mileage", format(selectedWeekStart, "yyyy-MM-dd"), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("vehicle_mileage_logs")
        .select("id, log_date, odometer_start, odometer_end")
        .eq("provider_id", user.id)
        .gte("log_date", format(selectedWeekStart, "yyyy-MM-dd"))
        .lte("log_date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Helper to calculate distance from mileage log
  const calculateLogDistance = (log: { odometer_start: number | null; odometer_end: number | null }): number => {
    if (log.odometer_start != null && log.odometer_end != null) {
      return log.odometer_end - log.odometer_start;
    }
    return 0;
  };

  // Calculate weekly summary
  const weekSummary: WeekSummary = useMemo(() => {
    const days: DayStats[] = weekDays.map((day) => {
      const dayAppointments = appointments.filter((a) => 
        isSameDay(new Date(a.date), day)
      );
      const dayMileage = mileageLogs.filter((m) => 
        isSameDay(new Date(m.log_date), day)
      );

      // Parse duration (could be number or string)
      const parseDuration = (dur: string | number | null): number => {
        if (dur == null) return 45; // default
        if (typeof dur === 'number') return dur;
        const match = dur.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 45;
      };

      return {
        date: day,
        appointments: dayAppointments.length,
        completedAppointments: dayAppointments.filter((a) => a.status === "completed").length,
        totalMinutes: dayAppointments.reduce((sum, a) => sum + parseDuration(a.duration), 0),
        distanceKm: dayMileage.reduce((sum, m) => sum + calculateLogDistance(m), 0),
      };
    });

    const totalAppointments = days.reduce((sum, d) => sum + d.appointments, 0);
    const completedAppointments = days.reduce((sum, d) => sum + d.completedAppointments, 0);
    const totalKm = days.reduce((sum, d) => sum + d.distanceKm, 0);
    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
    const avgTimePerClient = totalAppointments > 0 ? Math.round(totalMinutes / totalAppointments) : 0;

    return {
      totalAppointments,
      completedAppointments,
      totalKm,
      totalMinutes,
      avgTimePerClient,
      days,
    };
  }, [appointments, mileageLogs, weekDays]);

  // Find max values for chart scaling
  const maxAppointments = Math.max(...weekSummary.days.map((d) => d.appointments), 1);
  const maxKm = Math.max(...weekSummary.days.map((d) => d.distanceKm), 1);

  const isCurrentWeek = isSameDay(selectedWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Tour-Statistik
        </CardTitle>
        <CardDescription>
          Wochenübersicht deiner Touren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-medium">
              {format(selectedWeekStart, "dd. MMM", { locale: de })} – {format(weekEnd, "dd. MMM yyyy", { locale: de })}
            </p>
            {!isCurrentWeek && (
              <Button variant="link" size="sm" onClick={goToCurrentWeek} className="text-xs p-0 h-auto">
                Zur aktuellen Woche
              </Button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <Car className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{weekSummary.totalKm.toFixed(0)} km</p>
            <p className="text-xs text-muted-foreground">Gefahren</p>
          </div>
          <div className="bg-chart-2/10 rounded-lg p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-chart-2" />
            <p className="text-xl font-bold">{weekSummary.totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Termine</p>
          </div>
          <div className="bg-chart-3/10 rounded-lg p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-chart-3" />
            <p className="text-xl font-bold">{weekSummary.avgTimePerClient} min</p>
            <p className="text-xs text-muted-foreground">Ø pro Kunde</p>
          </div>
          <div className="bg-chart-4/10 rounded-lg p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-chart-4" />
            <p className="text-xl font-bold">
              {weekSummary.completedAppointments}/{weekSummary.totalAppointments}
            </p>
            <p className="text-xs text-muted-foreground">Abgeschlossen</p>
          </div>
        </div>

        {/* Daily Breakdown Chart */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Tagesübersicht</p>
          <div className="grid grid-cols-7 gap-2">
            {weekSummary.days.map((day) => {
              const isToday = isSameDay(day.date, new Date());
              const appointmentHeight = (day.appointments / maxAppointments) * 100;
              const kmHeight = maxKm > 0 ? (day.distanceKm / maxKm) * 100 : 0;

              return (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                    isToday && "bg-primary/10 ring-2 ring-primary/30"
                  )}
                >
                  {/* Day name */}
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(day.date, "EEE", { locale: de })}
                  </span>
                  
                  {/* Bar chart */}
                  <div className="flex gap-1 h-16 items-end">
                    {/* Appointments bar */}
                    <div
                      className="w-3 bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max(appointmentHeight, 4)}%` }}
                      title={`${day.appointments} Termine`}
                    />
                    {/* km bar */}
                    <div
                      className="w-3 bg-chart-3 rounded-t transition-all"
                      style={{ height: `${Math.max(kmHeight, 4)}%` }}
                      title={`${day.distanceKm.toFixed(0)} km`}
                    />
                  </div>

                  {/* Date */}
                  <span className={cn(
                    "text-xs",
                    isToday ? "font-bold text-primary" : "text-muted-foreground"
                  )}>
                    {format(day.date, "d")}
                  </span>

                  {/* Values */}
                  <div className="text-center space-y-0.5">
                    {day.appointments > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {day.appointments} 🐴
                      </Badge>
                    )}
                    {day.distanceKm > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {day.distanceKm.toFixed(0)} km
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Termine</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-chart-3 rounded" />
              <span>Kilometer</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
