import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface UnconfirmedAppointment {
  id: string;
  date: string;
  time: string | null;
  confirmation_token: string;
  horse: {
    name: string;
  };
}

export function UnconfirmedAppointmentsBanner() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<UnconfirmedAppointment[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUnconfirmedAppointments = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      // First get user's horses
      const { data: horses } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", user.id);

      if (!horses || horses.length === 0) return;

      const horseIds = horses.map((h) => h.id);

      // Then get unconfirmed upcoming appointments
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          confirmation_token,
          horses!inner (name)
        `)
        .in("horse_id", horseIds)
        .eq("is_confirmed_by_client", false)
        .eq("status", "scheduled")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      if (!error && data) {
        setAppointments(
          data.map((apt) => ({
            id: apt.id,
            date: apt.date,
            time: apt.time,
            confirmation_token: apt.confirmation_token,
            horse: { name: (apt.horses as any).name },
          }))
        );
      }
    };

    fetchUnconfirmedAppointments();
  }, [user]);

  const handleConfirm = async (appointment: UnconfirmedAppointment) => {
    setConfirming(appointment.id);
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          is_confirmed_by_client: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (error) throw error;

      // Remove from list
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
      
      toast({
        title: "Termin bestätigt",
        description: `Der Termin für ${appointment.horse.name} wurde erfolgreich bestätigt.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Der Termin konnte nicht bestätigt werden.",
        variant: "destructive",
      });
    } finally {
      setConfirming(null);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const visibleAppointments = appointments.filter((a) => !dismissedIds.has(a.id));

  if (visibleAppointments.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleAppointments.map((appointment) => (
        <div
          key={appointment.id}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">
              Bitte bestätige deinen Termin
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>{appointment.horse.name}</strong> am{" "}
              {format(new Date(appointment.date), "EEEE, d. MMMM", { locale: de })}
              {appointment.time && ` um ${appointment.time.substring(0, 5)} Uhr`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => handleConfirm(appointment)}
              disabled={confirming === appointment.id}
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirming === appointment.id ? "..." : "Bestätigen"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => handleDismiss(appointment.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
