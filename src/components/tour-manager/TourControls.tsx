import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Square, 
  Sparkles, 
  RotateCcw,
  Clock,
  MapPin,
  Loader2,
  Route,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Track location when tour is active (single watcher – no duplicate)
  useEffect(() => {
    if (!isTourActive || !tourId) return;
    
    let watchId: number | null = null;
    let lastTrackedPosition: { lat: number; lng: number } | null = null;
    
    const trackLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      if (lastTrackedPosition) {
        const distance = calculateDistance(
          lastTrackedPosition.lat, 
          lastTrackedPosition.lng,
          latitude,
          longitude
        );
        if (distance < 0.1) return;
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
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTourActive, tourId, userId, tourDate]);

  const handleStartTour = async () => {
    const dateStr = format(tourDate, "yyyy-MM-dd");
    
    try {
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
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onOptimizeRoute();
      toast.success("Route optimiert!");
    } finally {
      setIsOptimizing(false);
    }
  };

  const getElapsedTime = () => {
    if (!tourStartTime) return "--:--";
    const diff = Date.now() - tourStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="absolute top-4 left-4 z-[400] pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Tour Start/Stop Button */}
        <Button
          size="default"
          variant={isTourActive ? "destructive" : "default"}
          className={cn(
            "gap-2 shadow-lg h-10",
            isTourActive && "animate-pulse"
          )}
          onClick={isTourActive ? handleStopTour : handleStartTour}
          data-tour-start={!isTourActive ? "true" : undefined}
        >
          {isTourActive ? (
            <>
              <Square className="h-4 w-4" />
              <span className="hidden sm:inline">Tour beenden</span>
              <span className="sm:hidden">Stop</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Tour starten</span>
              <span className="sm:hidden">Start</span>
            </>
          )}
        </Button>

        {/* Live Stats (when tour active) */}
        <AnimatePresence>
          {isTourActive && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Badge 
                variant="secondary" 
                className="h-10 px-3 text-sm gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
              >
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                {getElapsedTime()}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Separate stats bar — positioned at top-right, below emergency buttons
export function TourStatsBar({
  routeInfo,
  isCalculatingRoute,
  completedCount,
  totalCount,
  hasCustomOrder,
  onOptimizeRoute,
  onResetOrder,
  userLocation,
}: {
  routeInfo: { distance: number; duration: number } | null;
  isCalculatingRoute: boolean;
  completedCount: number;
  totalCount: number;
  hasCustomOrder: boolean;
  onOptimizeRoute: () => void;
  onResetOrder: () => void;
  userLocation: [number, number] | null;
}) {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!userLocation) {
      toast.error("Standort wird benötigt für Optimierung");
      return;
    }
    setIsOptimizing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onOptimizeRoute();
      toast.success("Route optimiert!");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="absolute bottom-[calc(50vh+8px)] lg:bottom-auto lg:top-16 left-4 z-[300] pointer-events-none">
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Progress */}
        <Badge 
          variant="outline" 
          className="h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {completedCount}/{totalCount}
        </Badge>

        {/* Distance */}
        <Badge 
          variant="outline" 
          className="h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs"
        >
          {isCalculatingRoute ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Route className="h-3.5 w-3.5 text-primary" />
          )}
          {routeInfo ? `${routeInfo.distance} km` : "—"}
        </Badge>

        {/* Duration - hidden on small */}
        <Badge 
          variant="outline" 
          className="h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs hidden md:flex"
        >
          <Clock className="h-3.5 w-3.5 text-primary" />
          {routeInfo 
            ? `${Math.floor(routeInfo.duration / 60)}h ${routeInfo.duration % 60}m`
            : "—"
          }
        </Badge>

        {/* Optimize / Reset in dropdown for clean UI */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm shadow-lg"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleOptimize}
              disabled={isOptimizing || !userLocation}
            >
              {isOptimizing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Route optimieren
            </DropdownMenuItem>
            {hasCustomOrder && (
              <DropdownMenuItem onClick={onResetOrder}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Zurücksetzen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Use shared utility
import { haversineDistance as calculateDistance } from "@/lib/geo";
