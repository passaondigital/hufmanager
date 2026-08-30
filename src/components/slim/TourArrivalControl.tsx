import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { notifyTodayClients, resolveProviderDisplayName } from "@/lib/pushNotificationService";
import { isTourStopFinished } from "./slimTourUtils";

type ArrivalStop = {
  id: string;
  status: string | null;
  time: string | null;
  client_id: string | null;
  horses: Array<{ owner_id: string | null; name: string }>;
};

export function TourArrivalControl() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const nextStopQuery = useQuery({
    queryKey: ["tour-arrival-control", user?.id, today],
    enabled: !!user?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ArrivalStop | null> => {
      if (!user?.id) return null;

      const { data: tour, error: tourError } = await supabase
        .from("daily_tours")
        .select("status, tour_ended_at")
        .eq("provider_id", user.id)
        .eq("tour_date", today)
        .maybeSingle();

      if (tourError || !tour || tour.status !== "active" || tour.tour_ended_at) return null;

      const { data, error } = await supabase
        .from("appointments")
        .select("id, status, time, client_id, horses(owner_id, name)")
        .eq("provider_id", user.id)
        .eq("date", today)
        .neq("status", "cancelled")
        .order("tour_order", { ascending: true, nullsFirst: false })
        .order("time", { ascending: true });

      if (error) throw error;

      const row = (data ?? []).find((appointment: any) => !isTourStopFinished(appointment.status));
      if (!row) return null;

      const horses = Array.isArray((row as any).horses)
        ? (row as any).horses
        : (row as any).horses
          ? [(row as any).horses]
          : [];

      return {
        id: row.id,
        status: row.status,
        time: row.time,
        client_id: (row as any).client_id ?? null,
        horses: horses.map((horse: any) => ({ owner_id: horse.owner_id ?? null, name: horse.name || "Pferd" })),
      };
    },
  });

  const arrivedMutation = useMutation({
    mutationFn: async (stop: ArrivalStop) => {
      if (!user?.id || stop.status === "in_progress") return;

      const { error } = await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", stop.id)
        .eq("provider_id", user.id);
      if (error) throw error;

      const clientId = stop.client_id || stop.horses[0]?.owner_id || null;
      if (!clientId) return;

      const providerName = await resolveProviderDisplayName(user.id);
      const horseName = stop.horses.map((horse) => horse.name).join(", ") || "deinem Pferd";

      await supabase.from("notifications").insert({
        user_id: clientId,
        title: `${providerName} ist da! 🐴`,
        message: `${providerName} ist bei ${horseName} angekommen.`,
        type: "arrival",
        link: "/client-home",
      });

      await notifyTodayClients(user.id, "arrived", {
        clientId,
        providerName,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tour-arrival-control", user?.id, today] }),
        queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] }),
      ]);
      toast.success("Ankunft gemeldet");
    },
    onError: () => toast.error("Ankunft konnte nicht gespeichert werden"),
  });

  const nextStop = nextStopQuery.data;
  if (!nextStop) return null;

  const horseLabel = nextStop.horses.map((horse) => horse.name).join(" · ") || "nächster Termin";
  const isArrived = nextStop.status === "in_progress";

  return (
    <section className="hm-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Ankunft beim nächsten Tourstopp">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--hm-text-primary)]">
            {isArrived ? "Ankunft ist gemeldet" : "Am nächsten Stopp angekommen?"}
          </p>
          <p className="truncate text-xs text-[var(--hm-text-secondary)]">
            {horseLabel}{nextStop.time ? ` · ${String(nextStop.time).slice(0, 5)} Uhr` : ""}
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={() => arrivedMutation.mutate(nextStop)}
        disabled={isArrived || arrivedMutation.isPending}
        className="shrink-0"
      >
        <MapPin className="h-4 w-4" />
        {isArrived ? "Gemeldet" : "Angekommen"}
      </Button>
    </section>
  );
}
