import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

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
    owner: {
      full_name: string | null;
    } | null;
  } | null;
}

const typeColors: Record<string, string> = {
  Barhuf: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Korrektur: "bg-amber-500/10 text-amber-600",
  Hufpflege: "bg-green-500/10 text-green-600",
};

export function UpcomingAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    if (!user) return;
    
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
        horse:horses(
          id, 
          name,
          owner:profiles!horses_owner_id_fkey(full_name)
        )
      `)
      .eq("provider_id", user.id)
      .gte("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(10);

    if (!error && data) {
      setAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();

    // Real-time subscription for appointment updates
    const channel = supabase
      .channel("provider-appointments")
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
  }, [user]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Heute";
    if (isTomorrow(date)) return "Morgen";
    return format(date, "EEE, dd.MM.", { locale: de });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Bestätigt</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-xs">Fertig</Badge>;
      case "scheduled":
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-xs">Offen</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Kommende Termine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-border">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Kommende Termine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Keine anstehenden Termine</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Kommende Termine ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((apt, index) => (
          <div
            key={apt.id}
            className="p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  🐴 {apt.horse?.name || "Unbekanntes Pferd"}
                  {getStatusBadge(apt.status)}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {apt.horse?.owner?.full_name || "Unbekannter Kunde"}
                </p>
              </div>
              {apt.service_type && (
                <span className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  typeColors[apt.service_type] || "bg-muted text-muted-foreground"
                )}>
                  {apt.service_type}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getDateLabel(apt.date)}
                {apt.time && `, ${apt.time.slice(0, 5)}`}
              </span>
              {apt.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {apt.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
