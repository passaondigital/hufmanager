import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Route, UserMinus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppointmentFormModal } from "@/components/calendar/AppointmentFormModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAppointmentAndSave } from "@/lib/geocodeAppointment";
import { resolveProviderDisplayName, sendTypedPush } from "@/lib/pushNotificationService";

const FINISHED_STATUSES = new Set(["completed", "no_show", "cancelled"]);

type TourEditAppointment = {
  id: string;
  time: string | null;
  status: string | null;
  tour_order: number | null;
  client_id: string | null;
  horse_id: string | null;
  location: string | null;
  appointment_lat: number | null;
  appointment_lng: number | null;
  horses: { name: string | null; owner_id: string | null } | Array<{ name: string | null; owner_id: string | null }> | null;
  client: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function firstHorse(appointment: TourEditAppointment) {
  return Array.isArray(appointment.horses) ? appointment.horses[0] ?? null : appointment.horses;
}

function firstClient(appointment: TourEditAppointment) {
  return Array.isArray(appointment.client) ? appointment.client[0] ?? null : appointment.client;
}

function stopLabel(appointment: TourEditAppointment) {
  const clientName = firstClient(appointment)?.full_name || "Kunde";
  const horseName = firstHorse(appointment)?.name || "Pferd";
  const time = appointment.time ? String(appointment.time).slice(0, 5) : "–";
  return `${clientName} · ${horseName} · ${time}`;
}

export function TourLiveEditControl() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeId, setRemoveId] = useState("");

  const tourEditQuery = useQuery({
    queryKey: ["tour-live-edit", user?.id, today],
    enabled: !!user?.id,
    staleTime: 10_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!user?.id) return { active: false, appointments: [] as TourEditAppointment[] };

      const [tourResult, appointmentsResult] = await Promise.all([
        supabase
          .from("daily_tours")
          .select("status, tour_ended_at")
          .eq("provider_id", user.id)
          .eq("tour_date", today)
          .maybeSingle(),
        supabase
          .from("appointments")
          .select(`
            id, time, status, tour_order, client_id, horse_id, location, appointment_lat, appointment_lng,
            horses(name, owner_id),
            client:profiles!appointments_client_id_fkey(full_name)
          ` as any)
          .eq("provider_id", user.id)
          .eq("date", today)
          .order("tour_order", { ascending: true, nullsFirst: false })
          .order("time", { ascending: true }) as any,
      ]);

      if (tourResult.error) throw tourResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      return {
        active: tourResult.data?.status === "active" && !tourResult.data?.tour_ended_at,
        appointments: (appointmentsResult.data ?? []) as TourEditAppointment[],
      };
    },
  });

  const appointments = tourEditQuery.data?.appointments ?? [];
  const openAppointments = useMemo(
    () => appointments.filter((appointment) => !FINISHED_STATUSES.has(appointment.status || "")),
    [appointments],
  );

  const refreshTourAfterEdit = useCallback(async () => {
    if (!user?.id) return;

    const { data: currentAppointments, error } = await supabase
      .from("appointments")
      .select("id, status, tour_order, client_id, horse_id, location, appointment_lat, appointment_lng")
      .eq("provider_id", user.id)
      .eq("date", today)
      .neq("status", "cancelled")
      .order("tour_order", { ascending: true, nullsFirst: false })
      .order("time", { ascending: true });

    if (error) throw error;

    const rows = currentAppointments ?? [];
    let nextOrder = rows.reduce((max, row) => Math.max(max, Number(row.tour_order || 0)), 0) + 1;
    const withoutOrder = rows.filter((row) => row.tour_order == null && !FINISHED_STATUSES.has(row.status || ""));

    for (const row of withoutOrder) {
      const { error: orderError } = await supabase
        .from("appointments")
        .update({ tour_order: nextOrder })
        .eq("id", row.id)
        .eq("provider_id", user.id);
      if (orderError) throw orderError;
      nextOrder += 1;
    }

    const geocodeCandidates = rows.filter(
      (row) => !FINISHED_STATUSES.has(row.status || "") && (row.appointment_lat == null || row.appointment_lng == null),
    );

    await Promise.allSettled(
      geocodeCandidates.map((row) =>
        geocodeAppointmentAndSave(row.id, {
          clientId: row.client_id,
          horseId: row.horse_id,
          location: row.location,
        }),
      ),
    );

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tour-live-edit", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["tour-arrival-control", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["client-tour-status"] }),
    ]);
  }, [queryClient, today, user?.id]);

  const closeAddDialog = useCallback(async () => {
    setAddOpen(false);
    try {
      await refreshTourAfterEdit();
    } catch (error) {
      console.error("Tour refresh after appointment edit failed", error);
      toast.error("Tour konnte nach der Änderung nicht vollständig aktualisiert werden");
    }
  }, [refreshTourAfterEdit]);

  const removeStop = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!user?.id) throw new Error("AUTH_REQUIRED");
      const appointment = openAppointments.find((item) => item.id === appointmentId);
      if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");

      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment.id)
        .eq("provider_id", user.id);
      if (error) throw error;

      const horse = firstHorse(appointment);
      const clientId = appointment.client_id || horse?.owner_id || null;
      if (clientId) {
        const providerName = await resolveProviderDisplayName(user.id);
        await Promise.allSettled([
          supabase.from("notifications").insert({
            user_id: clientId,
            title: "Termin heute abgesagt",
            message: `${providerName} hat den heutigen Termin aus der Tour genommen. Bitte stimmt bei Bedarf einen neuen Termin ab.`,
            type: "appointment_cancelled",
            link: "/client-home",
          }),
          sendTypedPush(clientId, "appointment_cancelled", {
            providerName,
            horseName: horse?.name || undefined,
          }),
        ]);
      }

      return appointment;
    },
    onSuccess: async () => {
      setRemoveId("");
      setRemoveOpen(false);
      await refreshTourAfterEdit();
      toast.success("Stopp entfernt · Route und Kundenstatus aktualisiert");
    },
    onError: (error) => {
      console.error("Removing tour stop failed", error);
      toast.error("Stopp konnte nicht entfernt werden");
    },
  });

  if (!tourEditQuery.data?.active) return null;

  return (
    <>
      <section className="hm-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Laufende Tour bearbeiten">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
            <Route className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--hm-text-primary)]">Tour live ändern</p>
            <p className="text-xs text-[var(--hm-text-secondary)]">Stopps ergänzen oder entfernen. Verschieben kannst du weiterhin direkt in der Reihenfolge.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setRemoveOpen(true)} disabled={!openAppointments.length}>
            <UserMinus className="h-4 w-4" />
            Stopp entfernen
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Stopp hinzufügen
          </Button>
        </div>
      </section>

      <AppointmentFormModal
        isOpen={addOpen}
        onClose={() => void closeAddDialog()}
        selectedDate={new Date()}
        existingAppointments={appointments}
      />

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stopp aus heutiger Tour entfernen</DialogTitle>
            <DialogDescription>
              Der heutige Termin wird abgesagt, aus der Route entfernt und der Kunde wird informiert.
            </DialogDescription>
          </DialogHeader>

          <Select value={removeId} onValueChange={setRemoveId}>
            <SelectTrigger>
              <SelectValue placeholder="Stopp auswählen" />
            </SelectTrigger>
            <SelectContent>
              {openAppointments.map((appointment) => (
                <SelectItem key={appointment.id} value={appointment.id}>
                  {stopLabel(appointment)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!removeId || removeStop.isPending}
              onClick={() => removeId && removeStop.mutate(removeId)}
            >
              <UserMinus className="h-4 w-4" />
              Aus Tour entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
