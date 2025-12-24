import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

interface UpcomingAppointmentsListProps {
  userId: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  status: string | null;
  location: string | null;
  horse: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

export function UpcomingAppointmentsList({ userId }: UpcomingAppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          service_type,
          status,
          location,
          horse:horses(id, name, photo_url)
        `)
        .gte("date", today)
        .neq("status", "cancelled")
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(10);

      if (!error && data) {
        setAppointments(data as Appointment[]);
      }
      setLoading(false);
    };

    fetchAppointments();

    // Real-time subscription for appointment updates
    const channel = supabase
      .channel("client-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Heute";
    if (isTomorrow(date)) return "Morgen";
    return format(date, "EEEE, dd. MMM", { locale: de });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Bestätigt</Badge>;
      case "completed":
        return <Badge variant="secondary">Abgeschlossen</Badge>;
      case "scheduled":
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Ausstehend</Badge>;
    }
  };

  // Group appointments by horse
  const groupedByHorse = appointments.reduce((acc, apt) => {
    const horseId = apt.horse?.id || "unknown";
    const horseName = apt.horse?.name || "Unbekanntes Pferd";
    if (!acc[horseId]) {
      acc[horseId] = {
        horseName,
        photoUrl: apt.horse?.photo_url,
        appointments: [],
      };
    }
    acc[horseId].appointments.push(apt);
    return acc;
  }, {} as Record<string, { horseName: string; photoUrl: string | null; appointments: Appointment[] }>);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Keine Termine geplant</p>
          <p className="text-sm text-muted-foreground mt-1">
            Du hast aktuell keine anstehenden Termine.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Kommende Termine ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedByHorse).map(([horseId, { horseName, photoUrl, appointments: horseAppointments }]) => (
          <div key={horseId} className="space-y-3">
            {/* Horse Header */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt={horseName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg">🐴</span>
                )}
              </div>
              <span className="font-medium text-foreground">{horseName}</span>
              <Badge variant="secondary" className="ml-auto">
                {horseAppointments.length} {horseAppointments.length === 1 ? "Termin" : "Termine"}
              </Badge>
            </div>

            {/* Appointments for this horse */}
            <div className="space-y-2 pl-2">
              {horseAppointments.map((apt) => {
                const appointmentDate = new Date(apt.date);
                const countdown = formatDistanceToNow(appointmentDate, { locale: de, addSuffix: true });
                
                return (
                  <div
                    key={apt.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[50px] py-1 px-2 bg-primary/10 rounded-lg">
                      <span className="text-xs text-primary font-medium">
                        {format(appointmentDate, "MMM", { locale: de })}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {format(appointmentDate, "dd")}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {getDateLabel(apt.date)}
                        </span>
                        {getStatusBadge(apt.status)}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {apt.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.time.slice(0, 5)} Uhr
                          </span>
                        )}
                        <span className="text-primary">{countdown}</span>
                      </div>
                      
                      {apt.service_type && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {apt.service_type}
                        </p>
                      )}
                      
                      {apt.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {apt.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
