import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { calculateRoute } from "@/lib/routeService";

type LatLng = [number, number];
type LocationState = "idle" | "locating" | "ready" | "denied" | "unavailable" | "unsupported";

interface UseLiveTourEtaOptions {
  enabled: boolean;
  destination: LatLng | null;
}

export function useLiveTourEta({ enabled, destination }: UseLiveTourEtaOptions) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");

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
  }, [enabled, destination?.[0], destination?.[1]]);

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
