import { useState, useEffect, useRef } from "react";
import { Polyline, CircleMarker, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  History,
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Breadcrumb {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number | null;
}

interface BreadcrumbsReplayProps {
  tourDate: Date;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onBreadcrumbsChange?: (breadcrumbs: Breadcrumb[], currentIndex: number) => void;
}

// Component to render breadcrumbs on map
export function BreadcrumbsLayer({ 
  breadcrumbs, 
  currentIndex 
}: { 
  breadcrumbs: Breadcrumb[];
  currentIndex: number;
}) {
  const map = useMap();
  
  // Get visible breadcrumbs up to current index
  const visibleCrumbs = breadcrumbs.slice(0, currentIndex + 1);
  const positions = visibleCrumbs.map(b => [b.latitude, b.longitude] as [number, number]);
  
  // Center on current position
  useEffect(() => {
    if (visibleCrumbs.length > 0) {
      const current = visibleCrumbs[visibleCrumbs.length - 1];
      map.panTo([current.latitude, current.longitude], { animate: true });
    }
  }, [currentIndex, visibleCrumbs, map]);
  
  if (positions.length === 0) return null;
  
  return (
    <>
      {/* Trail polyline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: "hsl(217, 91%, 60%)",
          weight: 3,
          opacity: 0.7,
          dashArray: "5, 10",
        }}
      />
      
      {/* Breadcrumb dots */}
      {visibleCrumbs.map((crumb, idx) => {
        const isLast = idx === visibleCrumbs.length - 1;
        return (
          <CircleMarker
            key={crumb.id}
            center={[crumb.latitude, crumb.longitude]}
            radius={isLast ? 8 : 4}
            pathOptions={{
              color: isLast ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 70%)",
              fillColor: isLast ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 80%)",
              fillOpacity: isLast ? 1 : 0.6,
              weight: isLast ? 3 : 1,
            }}
          />
        );
      })}
    </>
  );
}

export function BreadcrumbsReplay({ 
  tourDate, 
  userId, 
  isOpen, 
  onClose,
  onBreadcrumbsChange
}: BreadcrumbsReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch breadcrumbs for the selected date
  const { data: breadcrumbs = [], isLoading } = useQuery({
    queryKey: ["tour-breadcrumbs", format(tourDate, "yyyy-MM-dd"), userId],
    queryFn: async () => {
      const dateStr = format(tourDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("tour_breadcrumbs")
        .select("id, latitude, longitude, timestamp, accuracy")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .order("timestamp", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Breadcrumb[];
    },
    enabled: isOpen && !!userId,
  });

  // Reset when breadcrumbs change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [breadcrumbs]);

  // Notify parent of breadcrumbs and index changes
  useEffect(() => {
    if (isOpen && onBreadcrumbsChange) {
      onBreadcrumbsChange(breadcrumbs, currentIndex);
    }
  }, [isOpen, breadcrumbs, currentIndex, onBreadcrumbsChange]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && breadcrumbs.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= breadcrumbs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, breadcrumbs.length, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentIndex >= breadcrumbs.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentIndex(breadcrumbs.length - 1);
    setIsPlaying(false);
  };

  const handleSliderChange = (value: number[]) => {
    setCurrentIndex(value[0]);
    setIsPlaying(false);
  };

  const currentBreadcrumb = breadcrumbs[currentIndex];
  const formattedTime = currentBreadcrumb 
    ? format(new Date(currentBreadcrumb.timestamp), "HH:mm:ss", { locale: de })
    : "--:--:--";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-md px-4"
      >
        <div className={cn(
          "bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-4",
          "space-y-3"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span className="font-semibold">Tour-Verlauf</span>
              <Badge variant="secondary" className="text-xs">
                {format(tourDate, "dd.MM.yyyy", { locale: de })}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : breadcrumbs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Keine Aufzeichnungen für diesen Tag
            </div>
          ) : (
            <>
              {/* Timeline Slider */}
              <div className="space-y-2">
                <Slider
                  value={[currentIndex]}
                  min={0}
                  max={breadcrumbs.length - 1}
                  step={1}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {breadcrumbs.length > 0 
                      ? format(new Date(breadcrumbs[0].timestamp), "HH:mm", { locale: de })
                      : "--:--"
                    }
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono font-medium text-foreground">{formattedTime}</span>
                  </div>
                  <span>
                    {breadcrumbs.length > 0 
                      ? format(new Date(breadcrumbs[breadcrumbs.length - 1].timestamp), "HH:mm", { locale: de })
                      : "--:--"
                    }
                  </span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={handleSkipBack}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="default" 
                  size="icon" 
                  className="h-12 w-12 rounded-full"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={handleSkipForward}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Speed Toggle */}
              <div className="flex items-center justify-center gap-1">
                {[0.5, 1, 2, 4].map(speed => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-around text-xs text-muted-foreground pt-1 border-t">
                <span>{currentIndex + 1} / {breadcrumbs.length} Punkte</span>
                <span>
                  {currentBreadcrumb?.accuracy 
                    ? `±${Math.round(currentBreadcrumb.accuracy)}m` 
                    : ""
                  }
                </span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export breadcrumbs and current index for map layer
export function useBreadcrumbsReplay(tourDate: Date, userId: string, isOpen: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: breadcrumbs = [] } = useQuery({
    queryKey: ["tour-breadcrumbs", format(tourDate, "yyyy-MM-dd"), userId],
    queryFn: async () => {
      const dateStr = format(tourDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("tour_breadcrumbs")
        .select("id, latitude, longitude, timestamp, accuracy")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .order("timestamp", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Breadcrumb[];
    },
    enabled: isOpen && !!userId,
  });
  
  return { breadcrumbs, currentIndex, setCurrentIndex };
}
