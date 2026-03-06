import { useEffect, useState } from "react";
import { HelpTip } from "@/components/ui/HelpTip";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  provider_id: string | null;
  horse: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

const CANCEL_REASONS = [
  { value: "verhindert", label: "Bin verhindert" },
  { value: "pferd_krank", label: "Pferd krank" },
  { value: "verschieben", label: "Muss verschieben" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function UpcomingAppointmentsList({ userId }: UpcomingAppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, date, time, service_type, status, location, provider_id,
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

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel("client-appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleCancelAppointment = async () => {
    if (!cancelTarget || !cancelReason) return;
    setCancelling(true);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", cancelTarget.id);

      if (error) throw error;

      // Notify provider
      if (cancelTarget.provider_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();

        const reasonLabel = CANCEL_REASONS.find(r => r.value === cancelReason)?.label || cancelReason;

        await supabase.from("notifications").insert({
          user_id: cancelTarget.provider_id,
          title: "Termin abgesagt",
          message: `${profile?.full_name || "Ein Kunde"} hat den Termin am ${format(new Date(cancelTarget.date), "dd.MM.yyyy")} abgesagt. Grund: ${reasonLabel}`,
          type: "appointment",
          link: "/termine",
        });
      }

      toast.success("Termin wurde abgesagt");
      fetchAppointments();
    } catch {
      toast.error("Fehler beim Absagen des Termins");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
      setCancelReason("");
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Heute";
    if (isTomorrow(date)) return "Morgen";
    return format(date, "EEEE, dd. MMM", { locale: de });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Bestätigt</Badge>;
      case "completed":
        return <Badge variant="secondary">Abgeschlossen</Badge>;
      case "scheduled":
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border">Ausstehend</Badge>;
    }
  };

  // Group appointments by horse
  const groupedByHorse = appointments.reduce((acc, apt) => {
    const horseId = apt.horse?.id || "unknown";
    const horseName = apt.horse?.name || "Unbekanntes Pferd";
    if (!acc[horseId]) {
      acc[horseId] = { horseName, photoUrl: apt.horse?.photo_url, appointments: [] };
    }
    acc[horseId].appointments.push(apt);
    return acc;
  }, {} as Record<string, { horseName: string; photoUrl: string | null; appointments: Appointment[] }>);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-6 w-40" /></CardHeader>
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
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Nächste Termine ({appointments.length})
            <HelpTip id="client.dashboard-upcoming" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedByHorse).map(([horseId, { horseName, photoUrl, appointments: horseAppointments }]) => (
            <div key={horseId} className="space-y-3">
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

              <div className="space-y-2 pl-2">
                {horseAppointments.map((apt) => {
                  const appointmentDate = new Date(apt.date);
                  const countdown = formatDistanceToNow(appointmentDate, { locale: de, addSuffix: true });
                  const canCancel = apt.status !== "completed" && appointmentDate >= new Date();
                  
                  return (
                    <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                          <span className="font-medium text-foreground">{getDateLabel(apt.date)}</span>
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
                          <p className="text-sm text-muted-foreground mt-1">{apt.service_type}</p>
                        )}
                        
                        {apt.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {apt.location}
                          </p>
                        )}

                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs gap-1"
                            onClick={() => setCancelTarget(apt)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Termin absagen
                          </Button>
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

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin absagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diesen Termin wirklich absagen? Dein Hufpfleger wird benachrichtigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Grund der Absage *
            </label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Bitte wählen..." />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Zurück</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={!cancelReason || cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Wird abgesagt..." : "Ja, absagen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
