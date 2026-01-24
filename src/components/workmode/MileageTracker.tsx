import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Gauge, 
  Play, 
  Square, 
  Camera, 
  MapPin, 
  Loader2, 
  Route,
  Calendar,
  X,
  Plus,
  Trash2,
  Navigation
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface MileageLog {
  id: string;
  log_date: string;
  odometer_start: number;
  odometer_end: number | null;
  photo_start_url: string | null;
  photo_end_url: string | null;
  purpose: string | null;
  route_description: string | null;
  status: string;
  stops?: TourStop[];
}

interface TourStop {
  id: string;
  name: string;
  notes?: string;
  photoUrl?: string;
  timestamp: string;
}

export function MileageTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const startPhotoRef = useRef<HTMLInputElement>(null);
  const endPhotoRef = useRef<HTMLInputElement>(null);
  const stopPhotoRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  const [isStarting, setIsStarting] = useState(false);
  const [startOdometer, setStartOdometer] = useState<number>(0);
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [purpose, setPurpose] = useState("");
  const [startPhotoUrl, setStartPhotoUrl] = useState<string | null>(null);
  const [endPhotoUrl, setEndPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stops, setStops] = useState<TourStop[]>([]);
  const [newStopName, setNewStopName] = useState("");

  // Get current vehicle odometer
  const { data: vehicle } = useQuery({
    queryKey: ["provider-vehicle", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_vehicles")
        .select("id, current_odometer, price_per_km")
        .eq("provider_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get active mileage log
  const { data: activeLog, isLoading } = useQuery({
    queryKey: ["active-mileage-log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_mileage_logs")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("status", "open")
        .maybeSingle();
      if (error) throw error;
      
      // Parse stops from route_description if stored as JSON
      if (data?.route_description) {
        try {
          const parsed = JSON.parse(data.route_description);
          if (parsed.stops) {
            setStops(parsed.stops);
          }
        } catch {
          // Not JSON, just a string description
        }
      }
      
      return data as MileageLog | null;
    },
    enabled: !!user?.id,
  });

  // Get recent logs
  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recent-mileage-logs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_mileage_logs")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .order("log_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveStops = async (logId: string, currentStops: TourStop[]) => {
    const routeData = JSON.stringify({
      stops: currentStops,
      purpose: purpose || activeLog?.purpose || "",
    });
    
    await supabase
      .from("vehicle_mileage_logs")
      .update({ route_description: routeData })
      .eq("id", logId);
  };

  const startTourMutation = useMutation({
    mutationFn: async () => {
      const routeData = stops.length > 0 
        ? JSON.stringify({ stops, purpose })
        : purpose;
        
      const { error } = await supabase.from("vehicle_mileage_logs").insert({
        provider_id: user!.id,
        vehicle_id: vehicle?.id,
        odometer_start: startOdometer,
        photo_start_url: startPhotoUrl,
        purpose,
        route_description: routeData,
        status: "open",
      });
      if (error) throw error;
      
      // Update vehicle odometer
      if (vehicle?.id) {
        await supabase
          .from("provider_vehicles")
          .update({ current_odometer: startOdometer })
          .eq("id", vehicle.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-mileage-log"] });
      queryClient.invalidateQueries({ queryKey: ["provider-vehicle"] });
      toast({ title: "Tour gestartet", description: "Gute Fahrt! 🚗" });
      setIsStarting(false);
      setPurpose("");
      setStartPhotoUrl(null);
      setStops([]);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const endTourMutation = useMutation({
    mutationFn: async () => {
      if (!activeLog) return;
      
      const distance = endOdometer - activeLog.odometer_start;
      const routeData = JSON.stringify({ stops, purpose: activeLog.purpose || "" });
      
      const { error } = await supabase
        .from("vehicle_mileage_logs")
        .update({
          odometer_end: endOdometer,
          photo_end_url: endPhotoUrl,
          route_description: routeData,
          status: "completed",
        })
        .eq("id", activeLog.id);
      if (error) throw error;
      
      // Update vehicle odometer
      if (vehicle?.id) {
        await supabase
          .from("provider_vehicles")
          .update({ current_odometer: endOdometer })
          .eq("id", vehicle.id);
      }
      
      return distance;
    },
    onSuccess: (distance) => {
      queryClient.invalidateQueries({ queryKey: ["active-mileage-log"] });
      queryClient.invalidateQueries({ queryKey: ["recent-mileage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["provider-vehicle"] });
      
      const cost = (distance || 0) * (vehicle?.price_per_km || 0.30);
      toast({ 
        title: "Tour beendet", 
        description: `${distance} km gefahren = ${cost.toFixed(2)} € Fahrtkosten` 
      });
      setEndOdometer(0);
      setEndPhotoUrl(null);
      setStops([]);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (type: "start" | "end", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `mileage/${user!.id}/${Date.now()}_${type}.jpg`;
      const { path, error } = await uploadFile("expense-receipts", fileName, file);
      if (error || !path) throw error || new Error("Upload failed");
      
      if (type === "start") {
        setStartPhotoUrl(path);
      } else {
        setEndPhotoUrl(path);
      }
      
      toast({ title: "Foto hochgeladen" });
    } catch (error) {
      toast({ title: "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStopPhotoUpload = async (stopId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `mileage/${user!.id}/${Date.now()}_stop_${stopId}.jpg`;
      const { path, error } = await uploadFile("expense-receipts", fileName, file);
      if (error || !path) throw error || new Error("Upload failed");
      
      const url = await getStorageUrl("expense-receipts", path);
      
      setStops(prev => prev.map(s => 
        s.id === stopId ? { ...s, photoUrl: url || path } : s
      ));
      
      if (activeLog) {
        const updatedStops = stops.map(s => 
          s.id === stopId ? { ...s, photoUrl: url || path } : s
        );
        await saveStops(activeLog.id, updatedStops);
      }
      
      toast({ title: "Stop-Foto hochgeladen" });
    } catch (error) {
      toast({ title: "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const addStop = async () => {
    if (!newStopName.trim()) return;
    
    const newStop: TourStop = {
      id: crypto.randomUUID(),
      name: newStopName.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const updatedStops = [...stops, newStop];
    setStops(updatedStops);
    setNewStopName("");
    
    if (activeLog) {
      await saveStops(activeLog.id, updatedStops);
      toast({ title: "Stop hinzugefügt", description: newStop.name });
    }
  };

  const removeStop = async (stopId: string) => {
    const updatedStops = stops.filter(s => s.id !== stopId);
    setStops(updatedStops);
    
    if (activeLog) {
      await saveStops(activeLog.id, updatedStops);
    }
  };

  const updateStopNotes = async (stopId: string, notes: string) => {
    const updatedStops = stops.map(s => 
      s.id === stopId ? { ...s, notes } : s
    );
    setStops(updatedStops);
    
    if (activeLog) {
      await saveStops(activeLog.id, updatedStops);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active Tour View
  if (activeLog) {
    return (
      <div className="space-y-4">
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                <Route className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Tour aktiv
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    Live
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Gestartet: {format(new Date(activeLog.log_date), "dd.MM.yyyy")} • 
                  Start km: {activeLog.odometer_start.toLocaleString("de-DE")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stops Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Zwischenstopps ({stops.length})
              </Label>
              
              {/* Add new stop */}
              <div className="flex gap-2">
                <Input
                  placeholder="Neuer Stop (z.B. Stall Müller)"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStop()}
                />
                <Button onClick={addStop} size="icon" disabled={!newStopName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Stops list */}
              {stops.length > 0 && (
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {stops.map((stop, index) => (
                      <div key={stop.id} className="p-3 rounded-lg bg-muted/50 border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-sm">{stop.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              ref={(el) => {
                                if (el) stopPhotoRefs.current.set(stop.id, el);
                              }}
                              onChange={(e) => handleStopPhotoUpload(stop.id, e)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => stopPhotoRefs.current.get(stop.id)?.click()}
                              disabled={isUploading}
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeStop(stop.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        {stop.photoUrl && (
                          <img 
                            src={stop.photoUrl} 
                            alt={stop.name} 
                            className="h-20 w-full object-cover rounded" 
                          />
                        )}
                        
                        <Input
                          placeholder="Notizen zum Stop..."
                          value={stop.notes || ""}
                          onChange={(e) => updateStopNotes(stop.id, e.target.value)}
                          className="text-xs h-8"
                        />
                        
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(stop.timestamp), "HH:mm")} Uhr
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  End-Tachostand
                </Label>
                <Input
                  type="number"
                  placeholder={`Mind. ${activeLog.odometer_start + 1}`}
                  value={endOdometer || ""}
                  onChange={(e) => setEndOdometer(parseInt(e.target.value) || 0)}
                  min={activeLog.odometer_start + 1}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto Tachostand (Ende)
                </Label>
                <input
                  ref={endPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload("end", e)}
                />
                {endPhotoUrl ? (
                  <div className="relative">
                    <img src={endPhotoUrl} alt="End" className="h-24 w-full object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setEndPhotoUrl(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => endPhotoRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    Foto aufnehmen
                  </Button>
                )}
              </div>

              {endOdometer > activeLog.odometer_start && (
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">
                    {(endOdometer - activeLog.odometer_start).toLocaleString("de-DE")} km
                  </p>
                  <p className="text-sm text-muted-foreground">
                    = {((endOdometer - activeLog.odometer_start) * (vehicle?.price_per_km || 0.30)).toFixed(2)} € Fahrtkosten
                  </p>
                  {stops.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stops.length} Stopp{stops.length !== 1 ? "s" : ""} erfasst
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => endTourMutation.mutate()}
                disabled={endOdometer <= activeLog.odometer_start || endTourMutation.isPending}
              >
                {endTourMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Tour beenden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Start Tour View
  if (isStarting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Neue Tour starten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Start-Tachostand
            </Label>
            <Input
              type="number"
              placeholder="km"
              value={startOdometer || (vehicle?.current_odometer || "")}
              onChange={(e) => setStartOdometer(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto Tachostand (optional)
            </Label>
            <input
              ref={startPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoUpload("start", e)}
            />
            {startPhotoUrl ? (
              <div className="relative">
                <img src={startPhotoUrl} alt="Start" className="h-24 w-full object-cover rounded-lg" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => setStartPhotoUrl(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => startPhotoRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Foto aufnehmen
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Zweck / Route (optional)
            </Label>
            <Textarea
              placeholder="z.B. Kundenbesuche Raum Berlin"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
            />
          </div>

          {/* Pre-plan stops */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Geplante Stops (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Stop hinzufügen..."
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newStopName.trim()) {
                      setStops(prev => [...prev, {
                        id: crypto.randomUUID(),
                        name: newStopName.trim(),
                        timestamp: new Date().toISOString(),
                      }]);
                      setNewStopName("");
                    }
                  }
                }}
              />
              <Button 
                type="button"
                size="icon" 
                variant="outline"
                disabled={!newStopName.trim()}
                onClick={() => {
                  if (newStopName.trim()) {
                    setStops(prev => [...prev, {
                      id: crypto.randomUUID(),
                      name: newStopName.trim(),
                      timestamp: new Date().toISOString(),
                    }]);
                    setNewStopName("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {stops.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {stops.map((stop, i) => (
                  <Badge key={stop.id} variant="secondary" className="gap-1">
                    {i + 1}. {stop.name}
                    <button 
                      onClick={() => setStops(prev => prev.filter(s => s.id !== stop.id))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => {
              setIsStarting(false);
              setStops([]);
            }}>
              Abbrechen
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => startTourMutation.mutate()}
              disabled={!startOdometer || startTourMutation.isPending}
            >
              {startTourMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Tour starten
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default View
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Kilometer-Tracker
        </CardTitle>
        <CardDescription>
          Erfasse deine Fahrten mit Tachostand-Fotos und Zwischenstopps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => {
            setStartOdometer(vehicle?.current_odometer || 0);
            setIsStarting(true);
          }}
        >
          <Play className="h-5 w-5" />
          Tour starten
        </Button>

        {recentLogs.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Letzte Fahrten</p>
            <div className="space-y-2">
              {recentLogs.map((log: any) => {
                let stopsCount = 0;
                try {
                  const parsed = JSON.parse(log.route_description || "{}");
                  stopsCount = parsed.stops?.length || 0;
                } catch {}
                
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm">{format(new Date(log.log_date), "dd.MM.yyyy")}</span>
                        {stopsCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {stopsCount} Stopp{stopsCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {log.odometer_end ? log.odometer_end - log.odometer_start : 0} km
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}