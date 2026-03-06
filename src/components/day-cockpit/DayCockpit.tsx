import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateRoute } from "@/lib/routeService";
import { notifyTodayClients } from "@/lib/pushNotificationService";
import type { RouteResult, RouteStep } from "@/lib/routeService";
import { prefetchTilesForRoute, clearTileCache } from "@/lib/tilePrefetch";
import { useFuelPrices, getCheapestPrice, mapFuelType } from "@/hooks/useFuelPrices";
import { geocodeAddress } from "@/lib/geocode";
import { useCockpitFullscreen } from "./CockpitFullscreenContext";
import { useServicePresets } from "@/hooks/useServicePresets";
import type { TourAppointment } from "@/components/tour-manager/TourCard";

import { CockpitReady } from "./CockpitReady";
import { CockpitUnderway } from "./CockpitUnderway";
import { CockpitComplete } from "./CockpitComplete";

export type CockpitState = "ready" | "underway" | "complete";

export function DayCockpit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { setFullscreen } = useCockpitFullscreen();
  const { presets } = useServicePresets();

  const [cockpitState, setCockpitState] = useState<CockpitState>("ready");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [activeAppointmentIndex, setActiveAppointmentIndex] = useState(0);
  const [tourId, setTourId] = useState<string | null>(null);
  const [tourStartTime, setTourStartTime] = useState<Date | null>(null);
  const [gpsTotalKm, setGpsTotalKm] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedElapsed, setPausedElapsed] = useState(0); // ms accumulated during pauses
  const pauseStartRef = useRef<number | null>(null);

  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Always fullscreen
  useEffect(() => {
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [setFullscreen]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Fetch today's appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["cockpit-appointments", today, user?.id],
    staleTime: 60_000, // 1 min – refresh more often so new appointments show up
    gcTime: 5 * 60 * 1000,
    retry: 2,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: aptData, error } = await supabase
        .from("appointments")
        .select(`
          id, date, time, status, service_type, is_emergency, tour_order, horse_id, client_id,
          location, duration,
          horses(id, name, owner_id, latitude, longitude)
        `)
        .eq("date", today)
        .eq("provider_id", user.id)
        .neq("status", "cancelled")
        .order("tour_order", { ascending: true, nullsFirst: false })
        .order("time", { ascending: true }) as any;

      if (error) {
        console.error("[DayCockpit] Appointment query error:", error.message, error.code, error.details);
        throw error; // Don't return [] – let React Query handle retry
      }
      if (!aptData) return [];

      const ownerIds = [...new Set(
        (aptData as any[]).map((apt: any) => apt.horses?.owner_id || apt.client_id).filter((id: any): id is string => !!id)
      )] as string[];

      const { data: contacts } = ownerIds.length > 0
        ? await supabase
            .from("contacts")
            .select("id, profile_id, full_name, street, zip_code, city")
            .eq("provider_id", user.id)
            .in("profile_id", ownerIds as string[])
        : { data: [] };

      const { data: profiles } = ownerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, readable_id")
            .in("id", ownerIds as string[])
        : { data: [] };

      const contactMap = Object.fromEntries((contacts || []).map(c => [c.profile_id, c]));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const grouped: Record<string, TourAppointment> = {};
      aptData.forEach((apt: any) => {
        const horse = apt.horses;
        const ownerId = horse?.owner_id || apt.client_id;
        const contact = ownerId ? contactMap[ownerId] : null;
        const profile = ownerId ? profileMap[ownerId] : null;

        // Use appointment GPS if available, else horse coords
        const geoLat = apt.appointment_lat || horse?.latitude || null;
        const geoLng = apt.appointment_lng || horse?.longitude || null;

        if (!grouped[apt.id]) {
          grouped[apt.id] = {
            id: apt.id,
            date: apt.date,
            time: apt.time,
            status: apt.status,
            service_type: apt.service_type,
            is_emergency: apt.is_emergency,
            horses: [],
            horse_count: 0,
            client: ownerId ? {
              id: ownerId,
              readable_id: profile?.readable_id || undefined,
              full_name: contact?.full_name || profile?.full_name || "Unbekannt",
              geo_lat: geoLat,
              geo_lng: geoLng,
              street: contact?.street || null,
              zip: contact?.zip_code || null,
              city: contact?.city || null,
            } : null,
          };
        }
        if (horse) {
          grouped[apt.id].horses?.push({ id: horse.id, name: horse.name, owner_id: horse.owner_id });
          grouped[apt.id].horse_count = (grouped[apt.id].horse_count || 0) + 1;
        }
      });

      // Geocode missing coordinates and save to appointment
      const entries = Object.values(grouped);
      for (const apt of entries) {
        if (apt.client && !apt.client.geo_lat && !apt.client.geo_lng) {
          const { street, zip, city } = apt.client;
          if (street || zip || city) {
            const result = await geocodeAddress(street, zip, city);
            if (result) {
              apt.client.geo_lat = result.lat;
              apt.client.geo_lng = result.lng;
              // Save to appointment record (new columns via cast)
              (supabase.from("appointments") as any)
                .update({ 
                  appointment_lat: result.lat, 
                  appointment_lng: result.lng, 
                  location_geocoded: true 
                })
                .eq("id", apt.id)
                .then(() => {});
              // Also save to horse
              const horseId = apt.horses?.[0]?.id;
              if (horseId) {
                supabase.from("horses")
                  .update({ latitude: result.lat, longitude: result.lng })
                  .eq("id", horseId)
                  .then(() => {});
              }
            }
          }
        }
      }

      return entries;
    },
    enabled: !!user?.id,
  });

  // Enrich appointments with preset color/buffer/duration
  const enrichedAppointments = useMemo(() => {
    if (!presets.length) return appointments;
    const presetMap = Object.fromEntries(presets.map(p => [p.service_type, p]));
    return appointments.map(apt => {
      const preset = apt.service_type ? presetMap[apt.service_type] : null;
      return {
        ...apt,
        service_color: preset?.color_hex || null,
        buffer_minutes: preset?.buffer_minutes || null,
        estimated_minutes: preset?.estimated_minutes || null,
      };
    });
  }, [appointments, presets]);

  // Check for active tour on mount
  useEffect(() => {
    const checkActiveTour = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("daily_tours")
        .select("id, tour_active_since, tour_ended_at")
        .eq("provider_id", user.id)
        .eq("tour_date", today)
        .maybeSingle();

      if (data?.tour_active_since && !data.tour_ended_at) {
        setTourId(data.id);
        setTourStartTime(new Date(data.tour_active_since));
        setCockpitState("underway");
      } else if (data?.tour_ended_at) {
        setTourId(data.id);
        setCockpitState("complete");
      }
    };
    checkActiveTour();
  }, [user?.id, today]);

  // Route positions
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    if (userLocation) positions.push(userLocation);
    enrichedAppointments.forEach(apt => {
      if (apt.client?.geo_lat && apt.client?.geo_lng) {
        positions.push([apt.client.geo_lat, apt.client.geo_lng]);
      }
    });
    return positions;
  }, [enrichedAppointments, userLocation]);

  // Route calculation with ORS optimization
  useEffect(() => {
    if (routePositions.length < 2) { setRouteInfo(null); return; }
    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    routeDebounceRef.current = setTimeout(async () => {
      setIsCalculatingRoute(true);
      try {
        const result = await calculateRoute(routePositions, {
          optimize: routePositions.length >= 3,
        });
        if (result) setRouteInfo(result);
      } catch (e) {
        console.error("Route calc error:", e);
      } finally {
        setIsCalculatingRoute(false);
      }
    }, 800);
    return () => { if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current); };
  }, [routePositions]);

  // Vehicle & fuel data
  const { data: vehicle } = useQuery({
    queryKey: ["cockpit-vehicle", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_vehicles")
        .select("id, average_consumption, fuel_type, price_per_km")
        .eq("provider_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: fuelData } = useFuelPrices({
    lat: userLocation?.[0],
    lng: userLocation?.[1],
    enabled: !!userLocation && !!vehicle?.average_consumption,
  });

  const fuelKey = mapFuelType(vehicle?.fuel_type) || "diesel";
  const livePrice = fuelData?.stations
    ? getCheapestPrice(fuelData.stations, fuelKey).price
    : null;

  const estimatedFuelCost = useMemo(() => {
    if (!routeInfo?.distance || !vehicle?.average_consumption || !livePrice) return null;
    return Math.round(routeInfo.distance * (vehicle.average_consumption / 100) * livePrice * 100) / 100;
  }, [routeInfo?.distance, vehicle?.average_consumption, livePrice]);

  // Haversine distance
  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // GPS tracking during tour (pauses when isPaused)
  useEffect(() => {
    if (cockpitState !== "underway" || !tourId || isPaused) {
      // Clear watch when paused
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      return;
    }
    if (!("geolocation" in navigator)) return;

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation([latitude, longitude]);

        if (lastGpsRef.current) {
          const d = haversine(lastGpsRef.current.lat, lastGpsRef.current.lng, latitude, longitude);
          if (d > 0.03 && accuracy < 50) {
            setGpsTotalKm(prev => Math.round((prev + d) * 10) / 10);
            lastGpsRef.current = { lat: latitude, lng: longitude };
          }
        } else {
          lastGpsRef.current = { lat: latitude, lng: longitude };
        }

        supabase.from("tour_breadcrumbs").insert({
          tour_id: tourId,
          provider_id: user!.id,
          latitude, longitude, accuracy,
          tour_date: today,
        }).then(() => {});
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [cockpitState, tourId, isPaused, user?.id, today]);

  // User location for "ready" state
  useEffect(() => {
    if (cockpitState !== "ready") return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [cockpitState]);

  // Start tour
  const handleStartTour = async () => {
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("daily_tours")
        .select("id")
        .eq("provider_id", user.id)
        .eq("tour_date", today)
        .maybeSingle();

      let newTourId: string;
      if (existing) {
        await supabase.from("daily_tours")
          .update({ tour_active_since: new Date().toISOString(), tour_ended_at: null })
          .eq("id", existing.id);
        newTourId = existing.id;
      } else {
        const { data: newTour } = await supabase.from("daily_tours")
          .insert({ provider_id: user.id, tour_date: today, tour_active_since: new Date().toISOString() })
          .select("id").single();
        newTourId = newTour!.id;
      }

      await supabase.from("work_sessions").insert({
        provider_id: user.id,
        started_at: new Date().toISOString(),
        status: "active",
        break_duration_minutes: 0,
      });

      await supabase.from("vehicle_mileage_logs").insert({
        provider_id: user.id,
        vehicle_id: vehicle?.id,
        log_date: today,
        odometer_start: 0,
      });

      setTourId(newTourId);
      setTourStartTime(new Date());
      setGpsTotalKm(0);
      lastGpsRef.current = null;
      setCockpitState("underway");

      if (routePositions.length >= 2) {
        prefetchTilesForRoute(routePositions).catch(console.error);
      }

      // Notify all today's clients that the tour has started
      const { data: provProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      let tourDisplayName = provProfile?.full_name;
      if (!tourDisplayName) {
        const { data: bs } = await supabase
          .from("business_settings")
          .select("business_name")
          .eq("user_id", user.id)
          .maybeSingle();
        tourDisplayName = bs?.business_name || "Dein Hufpfleger";
      }
      notifyTodayClients(user.id, "tour_start", {
        providerName: tourDisplayName,
      }).catch(console.error);
    } catch (err) {
      console.error("Start tour error:", err);
    }
  };

  // Complete appointment
  const handleCompleteAppointment = async (appointmentId: string) => {
    await supabase.from("appointments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", appointmentId);

    queryClient.invalidateQueries({ queryKey: ["cockpit-appointments"] });

    if (activeAppointmentIndex < appointments.length - 1) {
      setActiveAppointmentIndex(prev => prev + 1);
    }
  };

  // Mark arrived
  const handleArrived = async (appointmentId: string) => {
    await supabase.from("appointments")
      .update({ status: "in_progress" })
      .eq("id", appointmentId);
    queryClient.invalidateQueries({ queryKey: ["cockpit-appointments"] });

    const apt = appointments.find(a => a.id === appointmentId);
    if (apt?.client?.id) {
      // Resolve provider display name
      const { data: provProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .maybeSingle();
      let displayName = provProfile?.full_name;
      if (!displayName) {
        const { data: bs } = await supabase
          .from("business_settings")
          .select("business_name")
          .eq("user_id", user?.id)
          .maybeSingle();
        displayName = bs?.business_name || "Dein Hufpfleger";
      }

      // In-app notification
      await supabase.from("notifications").insert({
        user_id: apt.client.id,
        title: `${displayName} ist da! 🐴`,
        message: `${displayName} ist bei dir angekommen.`,
        type: "arrival",
        link: "/client-home",
      });

      // Push notification
      notifyTodayClients(user!.id, "arrived", {
        clientId: apt.client.id,
        providerName: displayName,
      }).catch(console.error);
    }
  };

  // End tour
  const handleEndTour = async () => {
    if (!tourId || !user?.id) return;

    await supabase.from("daily_tours")
      .update({
        tour_ended_at: new Date().toISOString(),
        total_distance_km: Math.round(gpsTotalKm * 10) / 10,
      })
      .eq("id", tourId);

    const { data: session } = await supabase
      .from("work_sessions")
      .select("id")
      .eq("provider_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (session) {
      await supabase.from("work_sessions")
        .update({ ended_at: new Date().toISOString(), status: "completed" })
        .eq("id", session.id);
    }

    const { data: mLog } = await supabase
      .from("vehicle_mileage_logs")
      .select("id")
      .eq("provider_id", user.id)
      .eq("log_date", today)
      .maybeSingle();
    if (mLog) {
      await supabase.from("vehicle_mileage_logs")
        .update({ odometer_end: Math.round(gpsTotalKm * 10) / 10 })
        .eq("id", mLog.id);
    }

    clearTileCache().catch(console.error);
    setCockpitState("complete");
  };

  // In-app navigation: ensure fullscreen cockpit mode with map visible
  const handleNavigate = (_lat: number, _lng: number) => {
    setFullscreen(true);
  };

  const activeAppointment = enrichedAppointments[activeAppointmentIndex] || null;
  const completedCount = enrichedAppointments.filter(a => a.status === "completed").length;

  // Pause/Resume handlers (must be before early returns)
  const handlePause = useCallback(() => {
    setIsPaused(true);
    pauseStartRef.current = Date.now();
    setFullscreen(false); // Show sidebar
  }, [setFullscreen]);

  const handleResume = useCallback(() => {
    if (pauseStartRef.current) {
      setPausedElapsed(prev => prev + (Date.now() - pauseStartRef.current!));
    }
    pauseStartRef.current = null;
    setIsPaused(false);
    setFullscreen(true); // Hide sidebar
  }, [setFullscreen]);

  // Adjusted tour start time (accounts for pauses)
  const adjustedTourStartTime = useMemo(() => {
    if (!tourStartTime) return null;
    return new Date(tourStartTime.getTime() + pausedElapsed + (isPaused && pauseStartRef.current ? Date.now() - pauseStartRef.current : 0));
  }, [tourStartTime, pausedElapsed, isPaused]);

  if (cockpitState === "ready") {
    return (
      <CockpitReady
        appointments={enrichedAppointments}
        isLoading={isLoading}
        routeInfo={routeInfo}
        isCalculatingRoute={isCalculatingRoute}
        estimatedFuelCost={estimatedFuelCost}
        livePrice={livePrice}
        isOnline={isOnline}
        onStartTour={handleStartTour}
      />
    );
  }

  if (cockpitState === "complete") {
    return (
      <CockpitComplete
        gpsTotalKm={Math.round(gpsTotalKm * 10) / 10}
        tourStartTime={tourStartTime}
        completedCount={completedCount}
        totalCount={appointments.length}
        livePrice={livePrice}
        vehicleConsumption={vehicle?.average_consumption}
        pricePerKm={vehicle?.price_per_km}
        isOnline={isOnline}
        onDismiss={() => setCockpitState("ready")}
      />
    );
  }

  return (
    <CockpitUnderway
      appointments={enrichedAppointments}
      activeAppointment={activeAppointment}
      activeIndex={activeAppointmentIndex}
      userLocation={userLocation}
      routePositions={routePositions}
      gpsTotalKm={Math.round(gpsTotalKm * 10) / 10}
      tourStartTime={adjustedTourStartTime}
      completedCount={completedCount}
      isOnline={isOnline}
      routeGeometry={routeInfo?.geometry}
      routeSteps={routeInfo?.steps}
      isPaused={isPaused}
      onNavigate={handleNavigate}
      onArrived={handleArrived}
      onComplete={handleCompleteAppointment}
      onEndTour={handleEndTour}
      onPause={handlePause}
      onResume={handleResume}
    />
  );
}
