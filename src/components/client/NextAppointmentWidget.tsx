import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow, isAfter } from "date-fns";
import { de } from "date-fns/locale";

interface NextAppointmentWidgetProps {
  userId: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  horse: {
    name: string;
  } | null;
}

export function NextAppointmentWidget({ userId }: NextAppointmentWidgetProps) {
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNextAppointment = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          service_type,
          horse:horses(name)
        `)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextAppointment(data as Appointment | null);
      setLoading(false);
    };

    fetchNextAppointment();
  }, [userId]);

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-8 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!nextAppointment) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Kein Termin geplant</p>
        </CardContent>
      </Card>
    );
  }

  const appointmentDate = new Date(nextAppointment.date);
  const countdown = formatDistanceToNow(appointmentDate, { locale: de, addSuffix: true });

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Dein nächster Termin
        </p>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-foreground">
              {format(appointmentDate, "EEEE, dd. MMM", { locale: de })}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {nextAppointment.time && (
                <>
                  <Clock className="h-3 w-3" />
                  <span>{nextAppointment.time.slice(0, 5)} Uhr</span>
                  <span>•</span>
                </>
              )}
              <span className="text-primary font-medium">{countdown}</span>
            </div>
          </div>
        </div>
        {nextAppointment.horse && (
          <p className="mt-2 text-sm text-muted-foreground">
            🐴 {nextAppointment.horse.name}
            {nextAppointment.service_type && ` • ${nextAppointment.service_type}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
