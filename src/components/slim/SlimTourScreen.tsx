import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fuel,
  GripVertical,
  MapPin,
  Navigation,
  Play,
  Route,
  RotateCcw,
  Square,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { DelayReportSheet } from "@/components/day-cockpit/DelayReportSheet";
import { NoShowSheet } from "@/components/day-cockpit/NoShowSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpTip } from "@/components/ui/HelpTip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveTourEta } from "@/hooks/useLiveTourEta";
import { calculateRoute } from "@/lib/routeService";
import { notifyTodayClients, resolveProviderDisplayName } from "@/lib/pushNotificationService";
import { getCheapestPrice, mapFuelType, useFuelPrices } from "@/hooks/useFuelPrices";
import {
  buildGoogleMapsRouteUrl,
  calculateActualOdometerDistance,
  calculateSlimTourCosts,
  getSlimTourStats,
  hasStopCoordinates,
  isTourStopFinished,
  isTourStopLockedForReplan,
  partitionStopsForReplan,
} from "./slimTourUtils";

type SlimTourStop = {
  id: string;
  time: string | null;
  status: string | null;
  service_type: string | null;
  location: string | null;
  appointment_lat: number | null;
  appointment_lng: number | null;
  tour_order: number | null;
  applied_price: number | null;
  price: number | null;
  horses: Array<{ id: string; name: string; owner_id: string | null }>;
  client: {
    id: string;
    full_name: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
  } | null;
};

type DailyTour = {
  id: string;
  status: string | null;
  total_distance_km: number | null;
  delay_minutes: number | null;
  delay_reason: string | null;
};
type TourSettings = { travel_cost_per_km: number | null; travel_cost_flat: number | null; vehicle_consumption_per_100km: number | null; vehicle_fuel_type: string | null };
type Vehicle = { id: string; name: string | null; price_per_km: number | null; travel_cost_flat: number | null; fuel_type: string | null; average_consumption: number | null };
type VehicleLog = { id: string; distance_km: number | null; fuel_cost: number | null; start_km?: number | null; end_km?: number | null };

function formatTime(value?: string | null) { return value ? value.slice(0, 5) : "–"; }
function formatMoney(value?: number | null) { return value == null ? "Noch offen" : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value); }

function distanceKm(a: [number, number], b: [number, number]) {
  const radius = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function estimateDistance(positions: [number, number][]) {
  if (positions.length < 2) return null;
  return Math.round(positions.slice(1).reduce((sum, point, index) => sum + distanceKm(positions[index], point), 0) * 10) / 10;
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

export function SlimTourScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [orderedStops, setOrderedStops] = useState<SlimTourStop[]>([]);
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [selectedStop, setSelectedStop] = useState<SlimTourStop | null>(null);
  const [delaySheetOpen, setDelaySheetOpen] = useState(false);
  const [noShowStop, setNoShowStop] = useState<SlimTourStop | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tourQuery = useQuery({
    queryKey: ["slim-tour-unchained", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { stops: [] as SlimTourStop[], dailyTour: null as DailyTour | null, settings: null as TourSettings | null, vehicle: null as Vehicle | null, vehicleLog: null as VehicleLog | null };
      const [appointmentsResult, dailyTourResult, settingsResult, vehicleResult, vehicleLogResult] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id, time, status, service_type, location, appointment_lat, appointment_lng, tour_order, applied_price, price,
            horses(id, name, owner_id, latitude, longitude),
            client:profiles!appointments_client_id_fkey(id, full_name, street, zip_code, city, geo_lat, geo_lng)
          ` as any)
          .eq("date", today)
          .eq("provider_id", user.id)
          .neq("status", "cancelled")
          .order("tour_order", { ascending: true, nullsFirst: false })
          .order("time", { ascending: true }) as any,
        (supabase.from("daily_tours") as any).select("id, status, total_distance_km, delay_minutes, delay_reason").eq("provider_id", user.id).eq("tour_date", today).maybeSingle(),
        supabase.from("business_settings").select("travel_cost_per_km, travel_cost_flat, vehicle_consumption_per_100km, vehicle_fuel_type").eq("user_id", user.id).maybeSingle(),
        supabase.from("provider_vehicles").select("id, name, price_per_km, travel_cost_flat, fuel_type, average_consumption").eq("provider_id", user.id).eq("is_primary", true).maybeSingle(),
        supabase.from("vehicle_logs").select("id, distance_km, fuel_cost, start_km, end_km").eq("provider_id", user.id).eq("log_date", today).maybeSingle(),
      ]);

      if (appointmentsResult.error) {
        console.error("Tour appointments failed", { code: appointmentsResult.error.code });
        throw new Error("TOUR_LOAD_FAILED");
      }
      if (dailyTourResult.error) throw new Error("TOUR_STATUS_FAILED");

      const stops = (appointmentsResult.data ?? []).map((row: any) => {
        const horses = Array.isArray(row.horses) ? row.horses : row.horses ? [row.horses] : [];
        const horse = horses[0] ?? null;
        const client = Array.isArray(row.client) ? row.client[0] : row.client;
        const ownerId = client?.id ?? horse?.owner_id ?? null;
        return {
          id: row.id,
          time: row.time,
          status: row.status,
          service_type: row.service_type,
          location: row.location,
          appointment_lat: row.appointment_lat,
          appointment_lng: row.appointment_lng,
          tour_order: row.tour_order,
          applied_price: row.applied_price == null ? null : Number(row.applied_price),
          price: row.price == null ? null : Number(row.price),
          horses: horses.map((item: any) => ({ id: item.id, name: item.name, owner_id: item.owner_id })),
          client: ownerId
            ? {
                id: ownerId,
                full_name: client?.full_name ?? null,
                street: client?.street ?? null,
                zip: client?.zip_code ?? null,
                city: client?.city ?? null,
                geo_lat: row.appointment_lat ?? client?.geo_lat ?? horse?.latitude ?? null,
                geo_lng: row.appointment_lng ?? client?.geo_lng ?? horse?.longitude ?? null,
              }
            : null,
        } satisfies SlimTourStop;
      });

      return {
        stops,
        dailyTour: dailyTourResult.data as DailyTour | null,
        settings: settingsResult.data as TourSettings | null,
        vehicle: vehicleResult.data as Vehicle | null,
        vehicleLog: vehicleLogResult.data as VehicleLog | null,
      };
    },
  });

  useEffect(() => { if (tourQuery.data?.stops) setOrderedStops(tourQuery.data.stops); }, [tourQuery.data?.stops]);
  useEffect(() => {
    const log = tourQuery.data?.vehicleLog;
    if (log?.start_km != null) setStartKm(String(log.start_km));
    if (log?.end_km != null) setEndKm(String(log.end_km));
  }, [tourQuery.data?.vehicleLog]);

  const isActive = tourQuery.data?.dailyTour?.status === "active";
  const currentDelay = Math.max(Number(tourQuery.data?.dailyTour?.delay_minutes || 0), 0);
  const openStops = useMemo(() => orderedStops.filter((stop) => !isTourStopFinished(stop.status)), [orderedStops]);
  const nextStop = openStops[0] ?? null;
  const routeStops = isActive ? openStops : orderedStops;
  const routePositions = useMemo(() => routeStops.filter(hasStopCoordinates).map((stop) => [stop.client!.geo_lat!, stop.client!.geo_lng!] as [number, number]), [routeStops]);
  const routeQuery = useQuery({
    queryKey: ["slim-tour-route-unchained", user?.id, isActive ? "active" : "planned", routePositions.map((point) => point.join(",")).join("|")],
    enabled: routePositions.length >= 2,
    queryFn: () => calculateRoute(routePositions, { optimize: false }),
    staleTime: 5 * 60 * 1000,
  });

  const routeLine = useMemo<[number, number][]>(() => {
    const coordinates = routeQuery.data?.geometry?.coordinates;
    return coordinates?.length ? coordinates.map(([lng, lat]) => [lat, lng]) : [];
  }, [routeQuery.data?.geometry]);
  const stats = useMemo(() => getSlimTourStats(orderedStops), [orderedStops]);
  const routeDistance = routeQuery.data?.distance ?? tourQuery.data?.dailyTour?.total_distance_km ?? estimateDistance(routePositions);
  const routeDuration = routeQuery.data?.duration ?? (routeDistance ? Math.round((routeDistance / 50) * 60) : null);
  const vehicle = tourQuery.data?.vehicle;
  const settings = tourQuery.data?.settings;
  const fuelType = mapFuelType(vehicle?.fuel_type ?? settings?.vehicle_fuel_type ?? null);
  const fuelQuery = useFuelPrices({ lat: nextStop?.client?.geo_lat, lng: nextStop?.client?.geo_lng, enabled: !!fuelType && !!nextStop?.client?.geo_lat && !!nextStop?.client?.geo_lng });
  const cheapestFuel = fuelType && fuelQuery.data?.stations ? getCheapestPrice(fuelQuery.data.stations, fuelType) : { price: null, station: null };
  const consumption = vehicle?.average_consumption ?? settings?.vehicle_consumption_per_100km;
  const estimatedFuelCost = routeDistance && cheapestFuel.price && consumption ? (routeDistance * consumption * cheapestFuel.price) / 100 : tourQuery.data?.vehicleLog?.fuel_cost ?? null;
  const costs = calculateSlimTourCosts({
    routeDistanceKm: routeDistance,
    vehiclePricePerKm: vehicle?.price_per_km,
    businessTravelCostPerKm: settings?.travel_cost_per_km,
    businessTravelCostFlat: settings?.travel_cost_flat,
    vehicleTravelCostFlat: vehicle?.travel_cost_flat,
    fuelCost: estimatedFuelCost,
  });
  const actualDistance = calculateActualOdometerDistance(startKm ? Number(startKm) : null, endKm ? Number(endKm) : null);
  const mapsUrl = buildGoogleMapsRouteUrl(orderedStops);
  const liveEtaDestination = nextStop?.client?.geo_lat != null && nextStop?.client?.geo_lng != null
    ? [nextStop.client.geo_lat, nextStop.client.geo_lng] as [number, number]
    : null;
  const liveEta = useLiveTourEta({ enabled: isActive, destination: liveEtaDestination });
  const liveEtaText = !isActive
    ? "Tour starten für Live-Ankunft"
    : !nextStop
      ? "Alle Stopps erledigt"
      : liveEta.arrivalLabel
        ? `Ankunft ca. ${liveEta.arrivalLabel} Uhr${liveEta.durationMinutes != null ? ` · ${liveEta.durationMinutes} Min.` : ""}`
        : liveEta.locationState === "denied"
          ? "Standortfreigabe fehlt – ETA nicht verfügbar"
          : liveEta.locationState === "unsupported"
            ? "Standort wird auf diesem Gerät nicht unterstützt"
            : liveEta.locationState === "unavailable"
              ? "Standort gerade nicht verfügbar"
              : liveEta.routeError
                ? "Fahrzeit konnte gerade nicht berechnet werden"
                : "Live-Ankunft wird berechnet …";

  const persistOrder = useMutation({
    mutationFn: async (stops: SlimTourStop[]) => {
      const results = await Promise.all(stops.map((stop, index) => supabase.from("appointments").update({ tour_order: index + 1 }).eq("id", stop.id)));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    },
    onError: () => void tourQuery.refetch(),
  });

  const optimizeTour = useMutation({
    mutationFn: async () => {
      const { finished, locked, candidates } = partitionStopsForReplan(orderedStops);
      const geocodedCandidates = candidates.filter(hasStopCoordinates);
      if (geocodedCandidates.length < 2) return orderedStops;

      const currentPosition = await getCurrentBrowserPosition();
      const lockedWithCoordinates = locked.find(hasStopCoordinates);
      const explicitStart: [number, number] | null = currentPosition
        ?? (lockedWithCoordinates
          ? [lockedWithCoordinates.client!.geo_lat!, lockedWithCoordinates.client!.geo_lng!]
          : null);
      const candidatePositions = geocodedCandidates.map((stop) => [stop.client!.geo_lat!, stop.client!.geo_lng!] as [number, number]);
      const planningPositions = explicitStart ? [explicitStart, ...candidatePositions] : candidatePositions;
      const result = await calculateRoute(planningPositions, { optimize: true });
      if (!result) throw new Error("ROUTE_OPTIMIZATION_FAILED");
      if (!result.optimized_order?.length) return orderedStops;

      const optimizedGeocoded = explicitStart
        ? result.optimized_order.map((jobId) => geocodedCandidates[jobId - 1]).filter(Boolean)
        : [geocodedCandidates[0], ...result.optimized_order.map((jobId) => geocodedCandidates[jobId]).filter(Boolean)];
      const optimizedIds = new Set(optimizedGeocoded.map((stop) => stop.id));
      const candidatesWithoutRoute = candidates.filter((stop) => !optimizedIds.has(stop.id));
      return [...finished, ...locked, ...optimizedGeocoded, ...candidatesWithoutRoute];
    },
    onSuccess: async (stops) => {
      setOrderedStops(stops);
      await persistOrder.mutateAsync(stops);
      void routeQuery.refetch();
    },
  });

  const startTour = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("AUTH_REQUIRED");
      const { error } = await supabase.from("daily_tours").upsert({
        provider_id: user.id,
        tour_date: today,
        status: "active",
        tour_active_since: new Date().toISOString(),
        tour_ended_at: null,
        delay_minutes: 0,
        delay_reason: null,
        delay_reported_at: null,
        live_lat: null,
        live_lng: null,
        live_accuracy: null,
        live_location_at: null,
      } as any, { onConflict: "provider_id,tour_date" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] });
      if (!user?.id) return;
      const providerName = await resolveProviderDisplayName(user.id);
      const sentCount = await notifyTodayClients(user.id, "tour_start", { providerName });
      toast.success(sentCount > 0 ? `Tour gestartet · ${sentCount} Kunde${sentCount === 1 ? "" : "n"} informiert` : "Tour gestartet");
    },
    onError: () => toast.error("Tour konnte nicht gestartet werden"),
  });

  const reportDelay = useMutation({
    mutationFn: async (delayMinutes: number) => {
      if (!user?.id) throw new Error("AUTH_REQUIRED");
      const { error } = await supabase.from("daily_tours").update({
        delay_minutes: delayMinutes,
        delay_reason: "Verzögerung im Tourablauf",
        delay_reported_at: new Date().toISOString(),
      } as any).eq("provider_id", user.id).eq("tour_date", today).eq("status", "active");
      if (error) throw error;

      const providerName = await resolveProviderDisplayName(user.id);
      return notifyTodayClients(user.id, "delay", { delayMinutes, providerName });
    },
    onSuccess: async (sentCount, delayMinutes) => {
      setDelaySheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] });
      toast.success(`${delayMinutes} Min. Verspätung gespeichert${sentCount > 0 ? ` · ${sentCount} Kunde${sentCount === 1 ? "" : "n"} informiert` : ""}`);
    },
    onError: () => toast.error("Verspätung konnte nicht gespeichert werden"),
  });

  const clearDelay = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("AUTH_REQUIRED");
      const { error } = await supabase.from("daily_tours").update({
        delay_minutes: 0,
        delay_reason: null,
        delay_reported_at: new Date().toISOString(),
      } as any).eq("provider_id", user.id).eq("tour_date", today);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] });
      toast.success("Verspätung aufgehoben");
    },
    onError: () => toast.error("Verspätung konnte nicht aufgehoben werden"),
  });

  const markNoShow = useMutation({
    mutationFn: async ({ stop, notes }: { stop: SlimTourStop; notes: string }) => {
      const { error } = await supabase.from("appointments").update({
        status: "no_show",
        completion_notes: notes.trim() || "Kunde nicht angetroffen",
        completed_at: new Date().toISOString(),
      }).eq("id", stop.id);
      if (error) throw error;

      if (stop.client?.id && user?.id) {
        const providerName = await resolveProviderDisplayName(user.id);
        await supabase.from("notifications").insert({
          user_id: stop.client.id,
          title: "Termin verpasst 😕",
          message: `${providerName} war heute bei dir – leider warst du nicht da. Bitte melde dich für einen neuen Termin.`,
          type: "no_show",
          link: "/client-home",
        });
      }
    },
    onSuccess: async () => {
      setNoShowStop(null);
      await queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] });
      toast.success("Als nicht angetroffen markiert");
    },
    onError: () => toast.error("Status konnte nicht gespeichert werden"),
  });

  const stopTour = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("AUTH_REQUIRED");
      if (actualDistance.status === "invalid") throw new Error("INVALID_ODOMETER");
      const { error } = await supabase.from("daily_tours").update({
        status: "completed",
        tour_ended_at: new Date().toISOString(),
        total_distance_km: routeDistance,
        delay_minutes: 0,
        delay_reason: null,
        live_lat: null,
        live_lng: null,
        live_accuracy: null,
        live_location_at: null,
      } as any).eq("provider_id", user.id).eq("tour_date", today);
      if (error) throw error;

      if (startKm || endKm) {
        const payload = {
          provider_id: user.id,
          log_date: today,
          start_km: startKm ? Number(startKm) : null,
          end_km: endKm ? Number(endKm) : null,
          fuel_cost: costs.operatingCost,
          appointment_ids: orderedStops.map((stop) => stop.id),
          route_description: actualDistance.status === "complete" ? `${orderedStops.length} Stopps · ${actualDistance.distanceKm} km tatsächlich` : `${orderedStops.length} Stopps · Fahrtenbuch unvollständig`,
          end_time: format(new Date(), "HH:mm:ss"),
        };
        const logId = tourQuery.data?.vehicleLog?.id;
        const result = logId ? await supabase.from("vehicle_logs").update(payload).eq("id", logId) : await supabase.from("vehicle_logs").insert(payload);
        if (result.error) throw result.error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slim-tour-unchained", user?.id, today] });
      toast.success("Tour beendet");
    },
    onError: () => toast.error("Tour konnte nicht beendet werden"),
  });

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedStops.findIndex((stop) => stop.id === active.id);
    const newIndex = orderedStops.findIndex((stop) => stop.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const activeStop = orderedStops[oldIndex];
    const lockedIndex = orderedStops.findIndex((stop) => isTourStopLockedForReplan(stop.status));
    if (isTourStopFinished(activeStop.status) || isTourStopLockedForReplan(activeStop.status)) {
      toast.info("Erledigte oder gerade laufende Stopps bleiben an ihrer Position.");
      return;
    }
    if (lockedIndex >= 0 && newIndex <= lockedIndex) {
      toast.info("Der aktuelle Termin bleibt vorne. Du kannst nur die folgenden Stopps verschieben.");
      return;
    }

    const reordered = arrayMove(orderedStops, oldIndex, newIndex);
    setOrderedStops(reordered);
    persistOrder.mutate(reordered);
  };

  if (tourQuery.isLoading) return <TourSkeleton />;
  if (tourQuery.isError) return <TourError onRetry={() => void tourQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--hm-text-secondary)]">Unterwegs arbeiten</p>
          <div className="mt-1 flex items-center gap-1">
            <h1 className="text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">Tour</h1>
            <HelpTip title="Tour" description="Plane zuerst deine Tagesroute und starte danach die Tour. Anschliessend musst du immer nur den naechsten Stopp bearbeiten." />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => optimizeTour.mutate()} disabled={openStops.filter((stop) => !isTourStopLockedForReplan(stop.status)).filter(hasStopCoordinates).length < 2 || optimizeTour.isPending}>
              <RotateCcw className={`h-4 w-4 ${optimizeTour.isPending ? "animate-spin" : ""}`} />
              Route planen
            </Button>
            <HelpTip title="Route planen" description="HufManager lässt einen bereits laufenden Termin fest stehen und optimiert nur die danach offenen Stopps. Als Start dient dein aktueller Standort, ersatzweise der aktuelle Stopp." />
          </div>
          {isActive && (
            <Button
              variant="outline"
              className={currentDelay > 0 ? "border-amber-500/50 text-amber-700 dark:text-amber-400" : ""}
              onClick={() => setDelaySheetOpen(true)}
              disabled={reportDelay.isPending}
            >
              <AlertTriangle className="h-4 w-4" />
              {currentDelay > 0 ? `+${currentDelay} Min.` : "Verspätung"}
            </Button>
          )}
          {isActive && currentDelay > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearDelay.mutate()} disabled={clearDelay.isPending} title="Verspätung aufheben">
              <X className="h-4 w-4" />
              Aufheben
            </Button>
          )}
          <Button onClick={() => isActive ? stopTour.mutate() : startTour.mutate()} disabled={!orderedStops.length || startTour.isPending || stopTour.isPending}>
            {isActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? "Tour beenden" : "Tour starten"}
          </Button>
        </div>
      </header>

      {isActive && currentDelay > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>Aktuelle Verspätung: +{currentDelay} Min.</strong> Offene Kunden sehen diese Verzögerung in ihrem Tourstatus.</span>
        </div>
      )}

      {!orderedStops.length ? (
        <section className="hm-card flex min-h-72 flex-col items-start justify-center p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><Route className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-semibold text-[var(--hm-text-primary)]">Heute sind noch keine Termine geplant.</h2><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">Mit dem ersten Termin entsteht automatisch deine Tagesroute.</p><button className="hm-button-primary mt-5" onClick={() => navigate("/kalender?new=true")}>Termin hinzufügen</button></section>
      ) : (
        <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-surface)] shadow-[var(--hm-shadow-card)] xl:grid-cols-[minmax(0,1fr)_23rem]">
          <section className="relative min-h-[31rem] overflow-hidden xl:min-h-full">
            <SlimRouteMap stops={orderedStops} routeLine={routeLine} selectedId={nextStop?.id ?? null} currentPosition={liveEta.position} />
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap gap-2 sm:left-4 sm:top-4">
              <MapBadge icon={Route} value={routeDistance == null ? "Route offen" : `${routeDistance.toFixed(1)} km`} />
              <MapBadge icon={Clock3} value={routeDuration == null ? "Fahrzeit offen" : `${routeDuration} Min.`} />
              <MapBadge icon={MapPin} value={`${stats.geocodedStops}/${stats.totalStops} mit Geo`} />
              {currentDelay > 0 && <MapBadge icon={AlertTriangle} value={`+${currentDelay} Min.`} />}
            </div>
            {routeQuery.isError && <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border border-orange-200 bg-white/95 p-3 text-sm text-slate-700 shadow-lg dark:border-orange-900/50 dark:bg-[#1D2128] dark:text-slate-200">Die Straßenroute konnte gerade nicht aktualisiert werden. Die Stopps bleiben sichtbar.</div>}
          </section>

          <aside className="flex min-h-0 flex-col border-t border-[var(--hm-border)] xl:border-l xl:border-t-0">
            <div className="border-b border-[var(--hm-border)] p-4">
              <p className="text-sm font-medium text-orange-600">{nextStop?.status === "in_progress" ? "Aktueller Stopp" : "Nächster Stopp"}</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-[var(--hm-text-primary)]">{nextStop?.client?.full_name || (stats.openStops === 0 ? "Alle Stopps erledigt" : "Kunde")}</h2>
              <p className="mt-1 text-sm text-[var(--hm-text-secondary)]">{nextStop ? `${nextStop.horses.map((horse) => horse.name).join(" · ") || "Pferd"} · ${formatTime(nextStop.time)}` : "Die Tagesroute ist abgearbeitet."}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-[var(--hm-text-secondary)]">
                <Clock3 className={`h-3.5 w-3.5 text-orange-600 ${liveEta.isCalculating ? "animate-pulse" : ""}`} />
                <span className={liveEta.arrivalLabel ? "font-semibold text-[var(--hm-text-primary)]" : ""}>{nextStop?.status === "in_progress" ? "Du bist an diesem Stopp angekommen." : liveEtaText}</span>
                <HelpTip title="Voraussichtliche Ankunft" description="Während einer aktiven Tour nutzt HufManager deinen aktuellen Gerätestandort und die echte Straßenfahrzeit zum nächsten offenen Stopp. Der Standort wird für diese ETA im Browser verwendet und hier nicht als Tourverlauf gespeichert." />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="hm-button-primary" onClick={() => mapsUrl && window.open(mapsUrl, "_blank", "noopener,noreferrer")} disabled={!mapsUrl}><Navigation className="h-4 w-4" />Navigation</button>
                <button className="hm-button-secondary" onClick={() => nextStop && setSelectedStop(nextStop)} disabled={!nextStop}>Termin öffnen</button>
              </div>
              {nextStop && (
                <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--hm-text-secondary)] hover:bg-amber-500/10 hover:text-amber-700" onClick={() => setNoShowStop(nextStop)}>
                  <UserX className="h-4 w-4" />
                  Nicht angetroffen
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <h3 className="text-base font-semibold text-[var(--hm-text-primary)]">Stop-Reihenfolge</h3>
                  <HelpTip title="Stop-Reihenfolge" description="Die Reihenfolge wird beim Route planen automatisch berechnet. Ein bereits laufender oder erledigter Stopp bleibt fest; die folgenden Stopps kannst du weiter verschieben." />
                </div>
                <span className="text-xs text-[var(--hm-text-secondary)]">Optional verschieben</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={orderedStops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-3 space-y-2">{orderedStops.map((stop, index) => <SortableStop key={stop.id} stop={stop} index={index} onOpen={() => setSelectedStop(stop)} />)}</div>
                </SortableContext>
              </DndContext>

              <div className="mt-6 border-t border-[var(--hm-border)] pt-5">
                <div className="flex items-center gap-1">
                  <h3 className="text-base font-semibold text-[var(--hm-text-primary)]">Fahrtkosten & Fahrtenbuch</h3>
                  <HelpTip title="Fahrtkosten & Fahrtenbuch" description="Dieser Bereich dokumentiert Kilometer und Fahrtkosten. Fuer den normalen Tourablauf musst du hier nur Start- und Endkilometer eintragen, wenn du das Fahrtenbuch nutzen willst." />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <CostCard label="Interne Fahrzeugkosten" value={formatMoney(costs.operatingCost)} hint={vehicle?.name || "Fahrzeug"} />
                  <CostCard label="Kunden-Anfahrt" value={formatMoney(costs.customerTravelCharge)} hint="separat berechnet" />
                </div>
                <div className="mt-3 rounded-xl bg-[var(--hm-surface-elevated)] p-3">
                  <div className="grid grid-cols-2 gap-2"><Input inputMode="numeric" value={startKm} onChange={(event) => setStartKm(event.target.value)} placeholder="Start-km" aria-label="Start-Kilometerstand" /><Input inputMode="numeric" value={endKm} onChange={(event) => setEndKm(event.target.value)} placeholder="End-km" aria-label="End-Kilometerstand" /></div>
                  <p className={`mt-2 text-xs ${actualDistance.status === "invalid" ? "text-red-600" : "text-[var(--hm-text-secondary)]"}`}>{actualDistance.status === "complete" ? `${actualDistance.distanceKm} km tatsächlich gefahren` : actualDistance.status === "invalid" ? "Der End-Kilometerstand muss größer sein." : "Ohne Kilometerstände bleibt das Fahrtenbuch unvollständig."}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-[var(--hm-text-secondary)]"><Fuel className="h-4 w-4 text-orange-600" />Kraftstoff in der Nähe</span><span className="font-semibold text-[var(--hm-text-primary)]">{cheapestFuel.price ? `${cheapestFuel.price.toFixed(3)} €/l` : "Bei Route verfügbar"}</span></div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <DelayReportSheet
        open={delaySheetOpen}
        onOpenChange={setDelaySheetOpen}
        onConfirm={(minutes) => reportDelay.mutate(minutes)}
        isSending={reportDelay.isPending}
      />

      <NoShowSheet
        open={!!noShowStop}
        onOpenChange={(open) => { if (!open) setNoShowStop(null); }}
        onConfirm={(notes) => noShowStop && markNoShow.mutate({ stop: noShowStop, notes })}
        isSending={markNoShow.isPending}
        clientName={noShowStop?.client?.full_name || noShowStop?.horses[0]?.name || undefined}
      />

      {selectedStop && (
        <AppointmentCompletionDialog
          open
          onClose={() => setSelectedStop(null)}
          appointmentId={selectedStop.id}
          horseName={selectedStop.horses.map((horse) => horse.name).join(", ") || "Pferd"}
          onCompleted={() => { setSelectedStop(null); void tourQuery.refetch(); }}
        />
      )}
    </div>
  );
}

function SlimRouteMap({ stops, routeLine, selectedId, currentPosition }: { stops: SlimTourStop[]; routeLine: [number, number][]; selectedId: string | null; currentPosition: [number, number] | null }) {
  const stopPositions = stops.filter(hasStopCoordinates).map((stop) => [stop.client!.geo_lat!, stop.client!.geo_lng!] as [number, number]);
  const positions = currentPosition ? [currentPosition, ...stopPositions] : stopPositions;
  const center = positions[0] ?? [49.75, 6.95];
  return (
    <MapContainer center={center} zoom={12} className="h-full min-h-[31rem] w-full bg-[#e9e7e1]" scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds positions={positions} />
      {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: "#FF6A00", weight: 6, opacity: 0.9 }} />}
      {currentPosition && (
        <CircleMarker center={currentPosition} radius={9} pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }}>
          <Popup><strong>Dein aktueller Standort</strong></Popup>
        </CircleMarker>
      )}
      {stops.map((stop, index) => hasStopCoordinates(stop) ? (
        <CircleMarker key={stop.id} center={[stop.client!.geo_lat!, stop.client!.geo_lng!]} radius={selectedId === stop.id ? 14 : 11} pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: isTourStopFinished(stop.status) ? "#5d625f" : "#FF6A00", fillOpacity: 1 }}>
          <Popup><div className="min-w-40"><strong>{index + 1}. {stop.client?.full_name || "Kunde"}</strong><div>{stop.horses.map((horse) => horse.name).join(", ")}</div><div>{formatTime(stop.time)} Uhr</div></div></Popup>
        </CircleMarker>
      ) : null)}
    </MapContainer>
  );
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (positions.length) map.fitBounds(L.latLngBounds(positions), { padding: [54, 54], maxZoom: 13 }); }, [map, positions]);
  return null;
}

function SortableStop({ stop, index, onOpen }: { stop: SlimTourStop; index: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const isPinned = isTourStopFinished(stop.status) || isTourStopLockedForReplan(stop.status);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded-xl border border-[var(--hm-border)] bg-[var(--hm-surface)] p-2 ${isDragging ? "z-10 shadow-xl" : ""}`}>
      <button type="button" {...attributes} {...listeners} disabled={isPinned} className="flex h-9 w-8 cursor-grab items-center justify-center rounded-lg text-[var(--hm-text-secondary)] hover:bg-orange-500/10 hover:text-orange-600 disabled:cursor-default disabled:opacity-35" aria-label={isPinned ? "Stopp ist fixiert" : "Stopp verschieben"}><GripVertical className="h-4 w-4" /></button>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">{index + 1}</span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1 text-left"><span className="block truncate text-sm font-semibold text-[var(--hm-text-primary)]">{stop.client?.full_name || "Kunde"}</span><span className="block truncate text-xs text-[var(--hm-text-secondary)]">{formatTime(stop.time)} · {stop.horses.map((horse) => horse.name).join(" + ") || stop.service_type}</span></button>
      {isTourStopFinished(stop.status) ? <CheckCircle2 className="h-4 w-4 text-orange-600" /> : <ArrowRight className="h-4 w-4 text-[var(--hm-text-secondary)]" />}
    </div>
  );
}

function MapBadge({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string }) { return <span className="flex min-h-9 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur dark:border-[#343a43] dark:bg-[#1D2128]/95 dark:text-slate-100"><Icon className="h-3.5 w-3.5 text-orange-600" />{value}</span>; }
function CostCard({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="rounded-xl bg-[var(--hm-surface-elevated)] p-3"><p className="text-xs text-[var(--hm-text-secondary)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--hm-text-primary)]">{value}</p><p className="mt-0.5 text-[11px] text-[var(--hm-text-secondary)]">{hint}</p></div>; }
function TourSkeleton() { return <div className="hm-card min-h-[calc(100vh-11rem)] animate-pulse bg-[var(--hm-surface-elevated)]" aria-label="Tour wird geladen" />; }
function TourError({ onRetry }: { onRetry: () => void }) { return <section className="hm-card flex min-h-72 flex-col items-start justify-center p-6"><Route className="h-7 w-7 text-orange-600" /><h1 className="mt-4 text-xl font-semibold text-[var(--hm-text-primary)]">Die Tour konnte gerade nicht geladen werden.</h1><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">Bitte prüfe die Verbindung und versuche es erneut.</p><button className="hm-button-primary mt-5" onClick={onRetry}>Erneut versuchen</button></section>; }
