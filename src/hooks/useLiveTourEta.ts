import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { calculateRoute } from "@/lib/routeService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type LatLng = [number, number];
type LocationState = "idle" | "locating" | "ready" | "denied" | "unavailable" | "unsupported";

interface UseLiveTourEtaOptions {
  enabled: boolean;
  destination: LatLng | null;
}

export function useLiveTourEta({ enabled, destination }: UseLiveTourEtaOptions) {
  const { user } = useAuth();
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const lastPublishedAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !destination) {
      setLocationState("idle");
      setPosition(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationState("unsupported");
      return;
    }

    setLocationState("locating");
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setLocationState("ready");

        const now = Date.now();
        if (user?.id && now - lastPublishedAtRef.current >= 30_000) {
          lastPublishedAtRef.current = now;
          void supabase
            .from("daily_tours")
            .update({
              live_lat: coords.latitude,
              live_lng: coords.longitude,
              live_accuracy: coords.accuracy,
              live_location_at: new Date(now).toISOString(),
            } as any)
            .eq("provider_id", user.id)
            .eq("status", "active")
            .is("tour_ended_at", null)
            .then(({ error }) => {
              if (error) console.warn("Live tour position could not be published", { code: error.code });
            });
        }
      },
      (error) => {
        setPosition(null);
        setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 12_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, destination?.[0], destination?.[1], user?.id]);

  // Remove the ephemeral position when the tour is no longer active. This is
  // intentionally not a breadcrumb/history log: one current point is kept.
  useEffect(() => {
    if (enabled || !user?.id) return;
    lastPublishedAtRef.current = 0;
    void supabase
      .from("daily_tours")
      .update({
        live_lat: null,
        live_lng: null,
        live_accuracy: null,
        live_location_at: null,
      } as any)
      .eq("provider_id", user.id)
      .not("live_location_at", "is", null)
      .then(({ error }) => {
        if (error) console.warn("Live tour position could not be cleared", { code: error.code });
      });
  }, [enabled, user?.id]);

  const stablePosition = useMemo<LatLng | null>(() => {
    if (!position) return null;
    return [Math.round(position[0] * 10_000) / 10_000, Math.round(position[1] * 10_000) / 10_000];
  }, [position]);

  const routeQuery = useQuery({
    queryKey: [
      "live-tour-eta",
      stablePosition?.[0],
      stablePosition?.[1],
      destination?.[0],
      destination?.[1],
    ],
    enabled: enabled && !!stablePosition && !!destination,
    queryFn: () => calculateRoute([stablePosition!, destination!], { optimize: false }),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const arrivalTime = useMemo(() => {
    const duration = routeQuery.data?.duration;
    if (duration == null) return null;
    return new Date(Date.now() + duration * 60_000);
  }, [routeQuery.data?.duration, routeQuery.dataUpdatedAt]);

  const arrivalLabel = arrivalTime
    ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(arrivalTime)
    : null;

  return {
    position,
    locationState,
    isCalculating: routeQuery.isFetching,
    arrivalLabel,
    durationMinutes: routeQuery.data?.duration ?? null,
    distanceKm: routeQuery.data?.distance ?? null,
    routeError: routeQuery.isError,
  };
}
