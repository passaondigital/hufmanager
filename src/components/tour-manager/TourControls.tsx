import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Square, 
  Sparkles, 
  RotateCcw,
  Navigation,
  Clock,
  MapPin,
  Loader2,
  Route
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { TourAppointment } from "./TourCard";

interface TourControlsProps {
  tourDate: Date;
  userId: string;
  appointments: TourAppointment[];
  userLocation: [number, number] | null;
  routeInfo: { distance: number; duration: number } | null;
  isCalculatingRoute: boolean;
  onOptimizeRoute: () => void;
  onResetOrder: () => void;
  hasCustomOrder: boolean;
}

export function TourControls({
  tourDate,
  userId,
  appointments,
  userLocation,
  routeInfo,
  isCalculatingRoute,
  onOptimizeRoute,
  onResetOrder,
  hasCustomOrder,
}: TourControlsProps) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStartTime, setTourStartTime] = useState<Date | null>(null);
  const [tourId, setTourId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const completedCount = appointments.filter(a => a.status === "completed").length;
  const totalCount = appointments.length;

  // Check for active tour on mount
  useEffect(() => {
    const checkActiveTour = async () => {
      const dateStr = format(tourDate, "yyyy-MM-dd");
      
      const { data } = await supabase
        .from("daily_tours")
        .select("id, tour_active_since")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .maybeSingle();
      
      if (data?.tour_active_since) {
        setIsTourActive(true);
        setTourStartTime(new Date(data.tour_active_since));
        setTourId(data.id);
      }
    };
    
    checkActiveTour();
  }, [tourDate, userId]);

  // Track location when tour is active
  useEffect(() => {
    if (!isTourActive || !tourId) return;
    
    let watchId: number | null = null;
    let lastTrackedPosition: { lat: number; lng: number } | null = null;
    
    const trackLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      // Only track if moved significantly (>100m) or first position
      if (lastTrackedPosition) {
        const distance = calculateDistance(
          lastTrackedPosition.lat, 
          lastTrackedPosition.lng,
          latitude,
          longitude
        );
        if (distance < 0.1) return; // Less than 100m
      }
      
      lastTrackedPosition = { lat: latitude, lng: longitude };
      
      await supabase.from("tour_breadcrumbs").insert({
        tour_id: tourId,
        provider_id: userId,
        latitude,
        longitude,
        accuracy,
        tour_date: format(tourDate, "yyyy-MM-dd"),
      });
    };
    
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        trackLocation,
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      );
    }
    
    // Also track every 5 minutes as fallback
    const intervalId = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(trackLocation);
      }
    }, 5 * 60 * 1000);
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(intervalId);
    };
  }, [isTourActive, tourId, userId, tourDate]);

  const handleStartTour = async () => {
    const dateStr = format(tourDate, "yyyy-MM-dd");
    
    try {
      // Create or update daily tour
      const { data: existing } = await supabase
        .from("daily_tours")
        .select("id")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from("daily_tours")
          .update({ tour_active_since: new Date().toISOString() })
          .eq("id", existing.id);
        setTourId(existing.id);
      } else {
        const { data: newTour } = await supabase
          .from("daily_tours")
          .insert({
            provider_id: userId,
            tour_date: dateStr,
            tour_active_since: new Date().toISOString(),
          })
          .select("id")
          .single();
        
        if (newTour) setTourId(newTour.id);
      }
      
      setIsTourActive(true);
      setTourStartTime(new Date());
      toast.success("Tour gestartet! Standort wird aufgezeichnet.");
    } catch (error) {
      console.error("Error starting tour:", error);
      toast.error("Tour konnte nicht gestartet werden");
    }
  };

  const handleStopTour = async () => {
    if (!tourId) return;
    
    try {
      await supabase
        .from("daily_tours")
        .update({ 
          tour_ended_at: new Date().toISOString(),
          total_distance_km: routeInfo?.distance || null,
        })
        .eq("id", tourId);
      
      setIsTourActive(false);
      setTourStartTime(null);
      toast.success("Tour beendet! Daten wurden gespeichert.");
    } catch (error) {
      console.error("Error stopping tour:", error);
      toast.error("Tour konnte nicht beendet werden");
    }
  };

  const handleOptimize = async () => {
    if (!userLocation) {
      toast.error("Standort wird benötigt für Optimierung");
      return;
    }
    
    setIsOptimizing(true);
    
    // Simple nearest neighbor optimization
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback
      onOptimizeRoute();
      toast.success("Route optimiert!");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!tourStartTime) return "--:--";
    const diff = Date.now() - tourStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
      <div className="flex flex-wrap items-start gap-2 pointer-events-auto">
        {/* Tour Start/Stop Button */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Button
            size="lg"
            variant={isTourActive ? "destructive" : "default"}
            className={cn(
              "gap-2 shadow-lg h-12 px-6",
              isTourActive && "animate-pulse"
            )}
            onClick={isTourActive ? handleStopTour : handleStartTour}
            data-tour-start={!isTourActive ? "true" : undefined}
          >
            {isTourActive ? (
              <>
                <Square className="h-5 w-5" />
                Tour beenden
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Tour starten
              </>
            )}
          </Button>
        </motion.div>

        {/* Live Stats (when tour active) */}
        <AnimatePresence>
          {isTourActive && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2"
            >
              <Badge 
                variant="secondary" 
                className="h-12 px-4 text-sm gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
              >
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                LIVE • {getElapsedTime()}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats Panel */}
        <div className="flex items-center gap-2">
          {/* Progress */}
          <Badge 
            variant="outline" 
            className="h-10 px-3 gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
          >
            <MapPin className="h-4 w-4 text-primary" />
            {completedCount}/{totalCount}
          </Badge>

          {/* Distance */}
          <Badge 
            variant="outline" 
            className="h-10 px-3 gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
          >
            {isCalculatingRoute ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Route className="h-4 w-4 text-primary" />
            )}
            {routeInfo ? `${routeInfo.distance} km` : "-- km"}
          </Badge>

          {/* Duration */}
          <Badge 
            variant="outline" 
            className="h-10 px-3 gap-2 bg-background/90 backdrop-blur-sm shadow-lg hidden sm:flex"
          >
            <Clock className="h-4 w-4 text-primary" />
            {routeInfo 
              ? `${Math.floor(routeInfo.duration / 60)}h ${routeInfo.duration % 60}m`
              : "--:--"
            }
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasCustomOrder && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-background/90 backdrop-blur-sm shadow-lg"
              onClick={onResetOrder}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="default"
            className="h-10 gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
            onClick={handleOptimize}
            disabled={isOptimizing || !userLocation}
          >
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Optimieren
          </Button>
        </div>
      </div>
    </div>
  );
}

// Use shared utility
import { haversineDistance as calculateDistance } from "@/lib/geo";
