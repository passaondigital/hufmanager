import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Euro, Clock, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, isSameDay, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";

interface CalendarWeekStatsProps {
  appointments: any[];
  currentDate: Date;
}

export function CalendarWeekStats({ appointments, currentDate }: CalendarWeekStatsProps) {
  const stats = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    const weekAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return isWithinInterval(aptDate, { start: weekStart, end: weekEnd });
    });

    const todayAppointments = appointments.filter((apt) =>
      isSameDay(new Date(apt.date), currentDate)
    );

    const totalCount = weekAppointments.length;
    const completedCount = weekAppointments.filter((a) => a.status === "completed").length;
    const plannedCount = weekAppointments.filter((a) => a.status === "planned" || a.status === "confirmed").length;
    const cancelledCount = weekAppointments.filter((a) => a.status === "cancelled").length;

    const totalRevenue = weekAppointments
      .filter((a) => a.status !== "cancelled")
      .reduce((sum: number, a: any) => sum + (a.price || a.applied_price || 0), 0);

    const totalDuration = weekAppointments
      .filter((a) => a.status !== "cancelled")
      .reduce((sum: number, a: any) => sum + (a.duration || 60), 0);

    // Daily breakdown for sparkline
    const dailyCounts: number[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const count = weekAppointments.filter((a) => isSameDay(new Date(a.date), day)).length;
      dailyCounts.push(count);
    }

    return {
      totalCount,
      completedCount,
      plannedCount,
      cancelledCount,
      totalRevenue,
      totalDuration,
      todayCount: todayAppointments.length,
      dailyCounts,
    };
  }, [appointments, currentDate]);

  const dayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const maxDaily = Math.max(...stats.dailyCounts, 1);

  return (
    <div className="space-y-3">
      {/* Week Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Woche
            </span>
            <span className="text-xs text-muted-foreground">
              {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d. MMM", { locale: de })} –{" "}
              {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d. MMM", { locale: de })}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-background">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <div className="text-lg font-bold leading-none">{stats.totalCount}</div>
                <div className="text-[10px] text-muted-foreground">Termine</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-background">
              <Euro className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-bold leading-none">
                  {stats.totalRevenue.toFixed(0)}€
                </div>
                <div className="text-[10px] text-muted-foreground">Umsatz</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-background">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-lg font-bold leading-none">{stats.completedCount}</div>
                <div className="text-[10px] text-muted-foreground">Erledigt</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-background">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-lg font-bold leading-none">
                  {Math.floor(stats.totalDuration / 60)}h
                </div>
                <div className="text-[10px] text-muted-foreground">Arbeitszeit</div>
              </div>
            </div>
          </div>

          {/* Mini sparkline */}
          <div className="space-y-1">
            <div className="flex items-end gap-1 h-8">
              {stats.dailyCounts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/60 transition-all"
                  style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? "4px" : "1px" }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {dayLabels.map((label, i) => (
                <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today Quick Stat */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Heute</span>
          </div>
          <Badge variant="secondary" className="text-sm">
            {stats.todayCount} Termine
          </Badge>
        </CardContent>
      </Card>

      {/* Status breakdown */}
      {stats.cancelledCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span className="text-red-500">●</span>
          <span>{stats.cancelledCount} abgesagt diese Woche</span>
        </div>
      )}
    </div>
  );
}
