import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  Camera,
  Car,
  Clock,
  RotateCcw,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrackingSession {
  id: string;
  startTime: number;
  endTime?: number;
  elapsedMs: number;
  odometerStart?: number;
  odometerEnd?: number;
  odometerStartPhoto?: string;
  odometerEndPhoto?: string;
  distanceKm?: number;
  travelCost?: number;
  status: "idle" | "running" | "paused" | "completed";
}

interface WorkTrackerProps {
  horseId?: string;
  horseName?: string;
  pricePerKm?: number;
  onSessionComplete?: (session: TrackingSession) => void;
}

const STORAGE_KEY = "huf_work_tracking_session";
const DEFAULT_PRICE_PER_KM = 0.50;

export function WorkTracker({ 
  horseId, 
  horseName, 
  pricePerKm = DEFAULT_PRICE_PER_KM,
  onSessionComplete 
}: WorkTrackerProps) {
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [odometerStart, setOdometerStart] = useState<string>("");
  const [odometerEnd, setOdometerEnd] = useState<string>("");
  const [odometerStartPhoto, setOdometerStartPhoto] = useState<string | null>(null);
  const [odometerEndPhoto, setOdometerEndPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPhotoRef = useRef<HTMLInputElement>(null);
  const endPhotoRef = useRef<HTMLInputElement>(null);

  // Load saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TrackingSession;
        setSession(parsed);
        if (parsed.odometerStartPhoto) setOdometerStartPhoto(parsed.odometerStartPhoto);
        if (parsed.odometerEndPhoto) setOdometerEndPhoto(parsed.odometerEndPhoto);
        if (parsed.odometerStart) setOdometerStart(String(parsed.odometerStart));
        if (parsed.odometerEnd) setOdometerEnd(String(parsed.odometerEnd));
      } catch (e) {
        console.error("Failed to parse saved session", e);
      }
    }
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (session) {
      const toSave = {
        ...session,
        odometerStartPhoto,
        odometerEndPhoto,
        odometerStart: odometerStart ? parseFloat(odometerStart) : undefined,
        odometerEnd: odometerEnd ? parseFloat(odometerEnd) : undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [session, odometerStartPhoto, odometerEndPhoto, odometerStart, odometerEnd]);

  // Timer logic
  useEffect(() => {
    if (session?.status === "running") {
      intervalRef.current = setInterval(() => {
        const elapsed = session.elapsedMs + (Date.now() - session.startTime);
        setDisplayTime(formatTime(elapsed));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (session) {
        setDisplayTime(formatTime(session.elapsedMs));
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session?.status, session?.elapsedMs, session?.startTime]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (!session || session.status === "idle") {
      setSession({
        id: crypto.randomUUID(),
        startTime: Date.now(),
        elapsedMs: 0,
        status: "running",
      });
    } else if (session.status === "paused") {
      setSession({
        ...session,
        startTime: Date.now(),
        status: "running",
      });
    }
  };

  const handlePause = () => {
    if (session?.status === "running") {
      const elapsed = session.elapsedMs + (Date.now() - session.startTime);
      setSession({
        ...session,
        elapsedMs: elapsed,
        status: "paused",
      });
    }
  };

  const handleStop = () => {
    if (session && (session.status === "running" || session.status === "paused")) {
      const finalElapsed = session.status === "running" 
        ? session.elapsedMs + (Date.now() - session.startTime)
        : session.elapsedMs;
      
      const startKm = odometerStart ? parseFloat(odometerStart) : undefined;
      const endKm = odometerEnd ? parseFloat(odometerEnd) : undefined;
      const distanceKm = startKm !== undefined && endKm !== undefined ? (endKm - startKm) * 2 : undefined;
      const travelCost = distanceKm !== undefined ? distanceKm * pricePerKm : undefined;

      const completedSession: TrackingSession = {
        ...session,
        endTime: Date.now(),
        elapsedMs: finalElapsed,
        odometerStart: startKm,
        odometerEnd: endKm,
        odometerStartPhoto: odometerStartPhoto || undefined,
        odometerEndPhoto: odometerEndPhoto || undefined,
        distanceKm,
        travelCost,
        status: "completed",
      };

      setSession(completedSession);
      onSessionComplete?.(completedSession);
      toast.success("Tracking abgeschlossen", {
        description: distanceKm 
          ? `${formatTime(finalElapsed)} Arbeitszeit, ${distanceKm.toFixed(1)} km Fahrt`
          : `${formatTime(finalElapsed)} Arbeitszeit erfasst`,
      });
    }
  };

  const handleReset = () => {
    setSession(null);
    setDisplayTime("00:00:00");
    setOdometerStart("");
    setOdometerEnd("");
    setOdometerStartPhoto(null);
    setOdometerEndPhoto(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePhotoUpload = (type: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === "start") {
        setOdometerStartPhoto(dataUrl);
      } else {
        setOdometerEndPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const calculateTravelCost = (): { distance: number; cost: number } | null => {
    const startKm = odometerStart ? parseFloat(odometerStart) : null;
    const endKm = odometerEnd ? parseFloat(odometerEnd) : null;
    if (startKm === null || endKm === null || endKm <= startKm) return null;
    
    const distance = (endKm - startKm) * 2; // Hin- und Rückfahrt
    const cost = distance * pricePerKm;
    return { distance, cost };
  };

  const travelCalc = calculateTravelCost();
  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";
  const isCompleted = session?.status === "completed";
  const isIdle = !session || session.status === "idle";

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Arbeitszeit-Tracking
          {horseName && (
            <Badge variant="secondary" className="ml-2 font-normal">
              {horseName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stopwatch Display */}
        <div className="text-center">
          <div className={cn(
            "font-mono text-5xl font-bold tracking-wider transition-colors",
            isRunning && "text-primary animate-pulse",
            isPaused && "text-muted-foreground",
            isCompleted && "text-green-500"
          )}>
            {displayTime}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {isRunning && (
              <Badge variant="default" className="bg-primary">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                Läuft
              </Badge>
            )}
            {isPaused && (
              <Badge variant="secondary">Pausiert</Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                Abgeschlossen
              </Badge>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          {(isIdle || isPaused) && !isCompleted && (
            <Button 
              size="lg" 
              onClick={handleStart}
              className="h-14 w-14 rounded-full"
            >
              <Play className="h-6 w-6" />
            </Button>
          )}
          {isRunning && (
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handlePause}
              className="h-14 w-14 rounded-full"
            >
              <Pause className="h-6 w-6" />
            </Button>
          )}
          {(isRunning || isPaused) && (
            <Button 
              size="lg" 
              variant="destructive"
              onClick={handleStop}
              className="h-14 w-14 rounded-full"
            >
              <Square className="h-6 w-6" />
            </Button>
          )}
          {(isPaused || isCompleted) && (
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleReset}
              className="h-14 w-14 rounded-full"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Odometer Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4" />
            <span className="text-sm font-medium">Fahrtkosten-Erfassung</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Odometer */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tacho Start (km)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 45123.5"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value)}
                className="h-11"
              />
              <input
                ref={startPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload("start")}
              />
              {odometerStartPhoto ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <img 
                    src={odometerStartPhoto} 
                    alt="Tacho Start" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setOdometerStartPhoto(null)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => startPhotoRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Foto
                </Button>
              )}
            </div>

            {/* End Odometer */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tacho Ende (km)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 45150.0"
                value={odometerEnd}
                onChange={(e) => setOdometerEnd(e.target.value)}
                className="h-11"
              />
              <input
                ref={endPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload("end")}
              />
              {odometerEndPhoto ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <img 
                    src={odometerEndPhoto} 
                    alt="Tacho Ende" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setOdometerEndPhoto(null)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => endPhotoRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Foto
                </Button>
              )}
            </div>
          </div>

          {/* Travel Cost Calculation */}
          {travelCalc && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Berechnete Fahrtkosten</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {travelCalc.distance.toFixed(1)} km × {pricePerKm.toFixed(2)} €/km
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {travelCalc.cost.toFixed(2)} €
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
