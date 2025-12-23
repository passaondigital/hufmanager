import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Clock, MapPin, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  status: string | null;
  location: string | null;
  price: number | null;
  completed_at: string | null;
  horse: {
    id: string;
    name: string;
  };
}

interface ServiceHistoryWidgetProps {
  userId: string;
}

export function ServiceHistoryWidget({ userId }: ServiceHistoryWidgetProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      // First get horses owned by user
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId)
        .is("deleted_at", null);

      if (horsesError || !horses || horses.length === 0) {
        setLoading(false);
        return;
      }

      const horseIds = horses.map(h => h.id);

      // Fetch appointments for these horses
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          service_type,
          status,
          location,
          price,
          completed_at,
          horse:horses(id, name)
        `)
        .in("horse_id", horseIds)
        .order("date", { ascending: false })
        .limit(20);

      if (!error && data) {
        setAppointments(data as Appointment[]);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [userId]);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "scheduled":
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "completed":
        return "Erledigt";
      case "cancelled":
        return "Abgesagt";
      case "scheduled":
      default:
        return "Geplant";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return null;
  }

  // Group appointments by status
  const completed = appointments.filter(a => a.status === "completed");
  const upcoming = appointments.filter(a => a.status === "scheduled");
  const cancelled = appointments.filter(a => a.status === "cancelled");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Service-Historie
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="px-4 pb-4 space-y-2">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-green-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Erledigt</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-600">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Geplant</p>
              </div>
              <div className="bg-muted rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-muted-foreground">{cancelled.length}</p>
                <p className="text-xs text-muted-foreground">Abgesagt</p>
              </div>
            </div>

            {/* Appointment List */}
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apt.status)}
                    <span className="font-medium text-sm">
                      {apt.service_type || "Hufbearbeitung"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(apt.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(apt.date), "dd. MMM yyyy", { locale: de })}
                  </span>
                  {apt.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {apt.time.slice(0, 5)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    🐴 {apt.horse?.name || "Unbekannt"}
                  </span>
                  {apt.price !== null && (
                    <span className="font-semibold text-foreground">
                      {formatCurrency(apt.price)}
                    </span>
                  )}
                </div>
                
                {apt.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {apt.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}