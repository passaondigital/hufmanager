import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function ClientKalender() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["client-calendar", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, location, service_type, horses(name)")
        .eq("client_id", user!.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date")
        .order("time");
      return data ?? [];
    },
    enabled: !!user,
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const appointmentsForDate = (date: Date) =>
    appointments.filter((a: any) => a.date === format(date, "yyyy-MM-dd"));

  const selectedAppointments = selectedDate ? appointmentsForDate(selectedDate) : [];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mein Kalender</h1>
        <Button size="sm" onClick={() => navigate("/client-booking")}>
          <Calendar className="h-4 w-4 mr-1.5" />
          Termin buchen
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy", { locale: de })}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayAppts = appointmentsForDate(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground hover:bg-muted",
                  isToday && "bg-primary/10 font-bold text-primary",
                  isSelected && "ring-2 ring-primary bg-primary/10"
                )}
              >
                {format(day, "d")}
                {dayAppts.length > 0 && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {dayAppts.slice(0, 3).map((_: any, i: number) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day appointments */}
      {selectedDate && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
          </h3>
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : selectedAppointments.length === 0 ? (
            <div className="text-center py-6 rounded-xl border border-border bg-card">
              <Calendar className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">Keine Termine an diesem Tag</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {selectedAppointments.map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    appt.status === "completed" ? "bg-green-500" : "bg-primary"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{(appt.horses as any)?.name || appt.service_type || "Termin"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {appt.time && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{appt.time.slice(0, 5)}</span>}
                      {appt.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{appt.location}</span>}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    appt.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                  )}>
                    {appt.status === "completed" ? "Erledigt" : appt.status === "confirmed" ? "Bestätigt" : "Geplant"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
