import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, parseISO, differenceInDays, isBefore, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface DueHorse {
  id: string;
  name: string;
  readable_id: string | null;
  owner_id: string;
  shoeing_interval: number;
  location_name: string | null;
  last_appointment_date: string | null;
  next_due_date: Date;
  days_until_due: number;
  is_overdue: boolean;
}

export function DueAppointmentsWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: dueHorses = [], isLoading } = useQuery({
    queryKey: ["due-appointments", user?.id],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysFromNow = addDays(now, 7);
      
      // Fetch all horses with their last completed appointment
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id, name, readable_id, owner_id, shoeing_interval, location_name")
        .is("deleted_at", null);
      
      if (horsesError) throw horsesError;
      if (!horses || horses.length === 0) return [];

      // Fetch the last completed appointment for each horse
      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .in("horse_id", horses.map(h => h.id))
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (apptError) throw apptError;

      // Get the latest appointment per horse
      const lastAppointmentByHorse: Record<string, string> = {};
      for (const apt of appointments || []) {
        if (!lastAppointmentByHorse[apt.horse_id]) {
          lastAppointmentByHorse[apt.horse_id] = apt.date;
        }
      }

      // Check for already scheduled future appointments
      const { data: scheduledAppts } = await supabase
        .from("appointments")
        .select("horse_id")
        .in("horse_id", horses.map(h => h.id))
        .in("status", ["scheduled", "planned"])
        .gte("date", format(now, "yyyy-MM-dd"));

      const horsesWithScheduled = new Set((scheduledAppts || []).map(a => a.horse_id));

      // Process horses to find due ones
      const dueList: DueHorse[] = [];
      
      for (const horse of horses) {
        // Skip if already has a scheduled appointment
        if (horsesWithScheduled.has(horse.id)) continue;

        const intervalWeeks = horse.shoeing_interval || 6; // Default 6 weeks
        const lastDate = lastAppointmentByHorse[horse.id];
        
        // If never had appointment, they're due
        if (!lastDate) {
          dueList.push({
            ...horse,
            shoeing_interval: intervalWeeks,
            last_appointment_date: null,
            next_due_date: now,
            days_until_due: 0,
            is_overdue: true,
          });
          continue;
        }

        // Calculate next due date
        const lastAppointment = parseISO(lastDate);
        const nextDue = addWeeks(lastAppointment, intervalWeeks);
        const daysUntilDue = differenceInDays(nextDue, now);
        
        // Include if due within 7 days or overdue
        if (isBefore(nextDue, sevenDaysFromNow)) {
          dueList.push({
            ...horse,
            shoeing_interval: intervalWeeks,
            last_appointment_date: lastDate,
            next_due_date: nextDue,
            days_until_due: daysUntilDue,
            is_overdue: daysUntilDue < 0,
          });
        }
      }

      // Sort: overdue first, then by days until due
      dueList.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return a.days_until_due - b.days_until_due;
      });

      return dueList.slice(0, 5); // Limit to 5 for widget
    },
    enabled: !!user,
  });

  const handleScheduleAppointment = (horseId: string) => {
    navigate("/kalender", { state: { preselectedHorseId: horseId } });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Fällige Termine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dueHorses.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Fällige Termine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine fälligen Termine in den nächsten 7 Tagen!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Fällige Termine
          <Badge variant="secondary" className="ml-auto">
            {dueHorses.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dueHorses.map((horse) => (
          <div
            key={horse.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {horse.name}
                </span>
                {horse.is_overdue && horse.days_until_due !== 0 ? (
                  <Badge variant="destructive" className="shrink-0">
                    {Math.abs(horse.days_until_due)} Tage überfällig
                  </Badge>
                ) : horse.days_until_due === 0 ? (
                  <Badge variant="default" className="shrink-0 bg-amber-500 hover:bg-amber-600">
                    Heute fällig
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    In {horse.days_until_due} Tagen
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span>
                  Intervall: {horse.shoeing_interval} Wochen
                </span>
                {horse.location_name && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {horse.location_name}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleScheduleAppointment(horse.id)}
                className="whitespace-nowrap"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Termin vereinbaren
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate(`/kunden?horse=${horse.id}`)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
