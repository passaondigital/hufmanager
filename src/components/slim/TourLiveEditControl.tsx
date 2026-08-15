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
import { calculateRoute } from "@/lib/routeService";

const FINISHED_STATUSES = new Set(["completed", "no_show", "cancelled"]);
type AddPlacement = "optimize" | "next" | "end";

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

type OrderableStop = {
  id: string;
  status: string | null;
  tour_order: number | null;
  appointment_lat: number | null;
  appointment_lng: number | null;
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

function getCurrentBrowserPosition(): Promise<[number, number] | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
    );
  });
}

export function TourLiveEditControl() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [addOpen, setAddOpen] = useState(false);
  const [addPlacement, setAddPlacement] = useState<AddPlacement>("optimize");
  const [addSnapshotIds, setAddSnapshotIds] = useState<string[]>([]);
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

  const persistOrder = useCallback(async (rows: Array<{ id: string }>) => {
    if (!user?.id) throw new Error("AUTH_REQUIRED");
    const results = await Promise.all(
      rows.map((row, index) =>
        supabase
          .from("appointments")
          .update({ tour_order: index + 1 })
          .eq("id", row.id)
          .eq("provider_id", user.id),
      ),
    );
    const failure = results.find((result) => result.error);
    if (failure?.error) throw failure.error;
  }, [user?.id]);

  const optimizeCurrentOpenStops = useCallback(async () => {
    if (!user?.id) return false;

    const { data, error } = await supabase
      .from("appointments")
      .select("id, status, tour_order, appointment_lat, appointment_lng")
      .eq("provider_id", user.id)
      .eq("date", today)
      .neq("status", "cancelled")
      .order("tour_order", { ascending: true, nullsFirst: false })
      .order("time", { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as OrderableStop[];
    const finishedStops = rows.filter((row) => FINISHED_STATUSES.has(row.status || ""));
    const openStops = rows.filter((row) => !FINISHED_STATUSES.has(row.status || ""));
    const geocodedStops = openStops.filter((row) => row.appointment_lat != null && row.appointment_lng != null);
    if (geocodedStops.length < 2) return false;

    const currentPosition = await getCurrentBrowserPosition();
    const stopPositions = geocodedStops.map((row) => [row.appointment_lat!, row.appointment_lng!] as [number, number]);
    const planningPositions = currentPosition ? [currentPosition, ...stopPositions] : stopPositions;
    const result = await calculateRoute(planningPositions, { optimize: true });
    if (!result?.optimized_order?.length) return false;

    const optimizedGeocoded = currentPosition
      ? result.optimized_order.map((jobId) => geocodedStops[jobId - 1]).filter(Boolean)
      : [geocodedStops[0], ...result.optimized_order.map((jobId) => geocodedStops[jobId]).filter(Boolean)];
    const optimizedIds = new Set(optimizedGeocoded.map((row) => row.id));
    const openWithoutRoute = openStops.filter((row) => !optimizedIds.has(row.id));

    await persistOrder([...finishedStops, ...optimizedGeocoded, ...openWithoutRoute]);
    return true;
  }, [persistOrder, today, user?.id]);

  const refreshTourAfterEdit = useCallback(async (options?: { previousIds?: string[]; placement?: AddPlacement }) => {
    if (!user?.id) return { addedCount: 0, optimized: false };

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
    const previousIds = new Set(options?.previousIds ?? []);
    const newRows = options?.previousIds
      ? rows.filter((row) => !previousIds.has(row.id) && !FINISHED_STATUSES.has(row.status || ""))
      : [];

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

    if (newRows.length) {
      const newIds = new Set(newRows.map((row) => row.id));
      const finishedRows = rows.filter((row) => FINISHED_STATUSES.has(row.status || ""));
      const existingOpenRows = rows.filter((row) => !FINISHED_STATUSES.has(row.status || "") && !newIds.has(row.id));
      const placement = options?.placement ?? "end";
      const orderedRows = placement === "next"
        ? [...finishedRows, ...newRows, ...existingOpenRows]
        : [...finishedRows, ...existingOpenRows, ...newRows];
      await persistOrder(orderedRows);
    } else {
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
    }

    const optimized = newRows.length > 0 && options?.placement === "optimize"
      ? await optimizeCurrentOpenStops()
      : false;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tour-live-edit", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["tour-arrival-control", user.id, today] }),
      queryClient.invalidateQueries({ queryKey: ["client-tour-status"] }),
    ]);

    return { addedCount: newRows.length, optimized };
  }, [optimizeCurrentOpenStops, persistOrder, queryClient, today, user?.id]);

  const openAddDialog = () => {
    setAddSnapshotIds(appointments.map((appointment) => appointment.id));
    setAddOpen(true);
  };

  const closeAddDialog = useCallback(async () => {
    setAddOpen(false);
    try {
      const result = await refreshTourAfterEdit({ previousIds: addSnapshotIds, placement: addPlacement });
      if (result.addedCount > 0) {
        if (addPlacement === "optimize") {
          toast.success(result.optimized ? "Stopp hinzugefügt · Route neu optimiert" : "Stopp hinzugefügt · Route aktualisiert");
        } else if (addPlacement === "next") {
          toast.success("Stopp hinzugefügt · ist jetzt als Nächstes dran");
        } else {
          toast.success("Stopp hinzugefügt · ans Tourende gesetzt");
        }
      }
    } catch (error) {
      console.error("Tour refresh after appointment edit failed", error);
      toast.error("Tour konnte nach der Änderung nicht vollständig aktualisiert werden");
    } finally {
      setAddSnapshotIds([]);
    }
  }, [addPlacement, addSnapshotIds, refreshTourAfterEdit]);

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
            <p className="text-xs text-[var(--hm-text-secondary)]">Neue Stopps flexibel einsortieren, entfernen oder per Drag-&-Drop verschieben.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setRemoveOpen(true)} disabled={!openAppointments.length}>
            <UserMinus className="h-4 w-4" />
            Stopp entfernen
          </Button>
          <Select value={addPlacement} onValueChange={(value) => setAddPlacement(value as AddPlacement)}>
            <SelectTrigger className="w-[11.5rem]" aria-label="Neuen Stopp einsortieren">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="optimize">Automatisch planen</SelectItem>
              <SelectItem value="next">Als Nächstes</SelectItem>
              <SelectItem value="end">Ans Ende</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={openAddDialog}>
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
