import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, X, XCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { sendTypedPush, resolveProviderDisplayName } from "@/lib/pushNotificationService";

interface UnconfirmedAppointment {
  id: string;
  date: string;
  time: string | null;
  confirmation_token: string;
  provider_id: string;
  horse: {
    name: string;
  };
}

export function UnconfirmedAppointmentsBanner() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<UnconfirmedAppointment[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUnconfirmedAppointments = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: horses } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", user.id);

      if (!horses || horses.length === 0) return;

      const horseIds = horses.map((h) => h.id);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, date, time, confirmation_token, provider_id,
          horses!inner (name)
        `)
        .in("horse_id", horseIds)
        .eq("is_confirmed_by_client", false)
        .in("status", ["scheduled", "planned"])
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
            provider_id: apt.provider_id,
            horse: { name: (apt.horses as any).name },
          }))
        );
      }
    };

    fetchUnconfirmedAppointments();

    // Realtime: listen for new appointments
    const channel = supabase
      .channel("unconfirmed-appointments")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "appointments",
      }, () => { fetchUnconfirmedAppointments(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleConfirm = async (appointment: UnconfirmedAppointment) => {
    setConfirming(appointment.id);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          is_confirmed_by_client: true,
          confirmed_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", appointment.id);

      if (error) throw error;

      // Remove from list
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));

      // Get client name for provider notification
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      const clientName = clientProfile?.full_name || "Ein Kunde";

      // In-app notification to provider
      await supabase.from("notifications").insert({
        user_id: appointment.provider_id,
        title: "Termin bestätigt ✅",
        message: `${clientName} hat den Termin für ${appointment.horse.name} am ${format(new Date(appointment.date), "dd.MM.yyyy")} bestätigt.`,
        type: "appointment_confirmed",
        link: "/termine",
      });

      // Push notification to provider
      sendTypedPush(appointment.provider_id, "appointment_confirmed", {
        providerName: clientName,
        horseName: appointment.horse.name,
      }, "/termine").catch(console.error);

      toast({
        title: "Termin bestätigt ✅",
        description: `Der Termin für ${appointment.horse.name} wurde erfolgreich bestätigt.`,
      });
    } catch {
      toast({
        title: "Fehler",
        description: "Der Termin konnte nicht bestätigt werden.",
        variant: "destructive",
      });
    } finally {
      setConfirming(null);
    }
  };

  const handleCancel = async (appointment: UnconfirmedAppointment) => {
    setCancelling(appointment.id);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment.id);

      if (error) throw error;

      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));

      // Get client name
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      const clientName = clientProfile?.full_name || "Ein Kunde";

      // In-app notification to provider
      await supabase.from("notifications").insert({
        user_id: appointment.provider_id,
        title: "Termin abgelehnt ❌",
        message: `${clientName} hat den Termin für ${appointment.horse.name} am ${format(new Date(appointment.date), "dd.MM.yyyy")} abgesagt.`,
        type: "appointment_declined",
        link: "/termine",
      });

      // Push notification to provider
      sendTypedPush(appointment.provider_id, "appointment_declined", {
        providerName: clientName,
        horseName: appointment.horse.name,
      }, "/termine").catch(console.error);

      toast({
        title: "Termin abgesagt",
        description: `Der Termin für ${appointment.horse.name} wurde abgesagt.`,
      });
    } catch {
      toast({
        title: "Fehler",
        description: "Der Termin konnte nicht abgesagt werden.",
        variant: "destructive",
      });
    } finally {
      setCancelling(null);
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
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                Neuer Termin – bitte bestätigen
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <strong>{appointment.horse.name}</strong> am{" "}
                {format(new Date(appointment.date), "EEEE, d. MMMM", { locale: de })}
                {appointment.time && ` um ${appointment.time.substring(0, 5)} Uhr`}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleConfirm(appointment)}
                  disabled={confirming === appointment.id || cancelling === appointment.id}
                  className="gap-1.5 min-h-[44px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {confirming === appointment.id ? "..." : "Bestätigen"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancel(appointment)}
                  disabled={confirming === appointment.id || cancelling === appointment.id}
                  className="gap-1.5 min-h-[44px]"
                >
                  <XCircle className="h-4 w-4" />
                  {cancelling === appointment.id ? "..." : "Absagen"}
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
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
