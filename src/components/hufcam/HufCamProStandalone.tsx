import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HufCamPro } from "./HufCamPro";

interface HorseOption {
  id: string;
  name: string;
  breed: string | null;
}

/**
 * Standalone version of HufCamPro with built-in horse selector
 * Used in WorkMode and other contexts where horse selection is needed
 */
export function HufCamProStandalone() {
  const { user } = useAuth();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch horses on mount - provider sees horses via appointments
  useEffect(() => {
    async function fetchHorses() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Providers see horses they have access to via appointments
        const query: any = supabase.from("appointments");
        const { data: appointmentData, error: appointmentError } = await query
          .select("horse:horses(id, name, breed)")
          .eq("provider_id", user.id)
          .not("horse", "is", null);
        
        if (appointmentError) throw appointmentError;
        
        // Extract unique horses from appointments
        const horseMap = new Map<string, HorseOption>();
        (appointmentData || []).forEach((apt: any) => {
          if (apt.horse && apt.horse.id) {
            horseMap.set(apt.horse.id, {
              id: apt.horse.id,
              name: apt.horse.name,
              breed: apt.horse.breed,
            });
          }
        });
        
        const uniqueHorses = Array.from(horseMap.values())
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setHorses(uniqueHorses);
      } catch (err) {
        console.error("Failed to fetch horses:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchHorses();
  }, [user?.id]);

  const selectedHorse = horses.find(h => h.id === selectedHorseId);

  if (isCapturing && selectedHorse) {
    return (
      <HufCamPro
        horseId={selectedHorse.id}
        horseName={selectedHorse.name}
        onComplete={() => setIsCapturing(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          HufCam Pro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : horses.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Keine Pferde vorhanden. Bitte erst ein Pferd anlegen.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pferd auswählen</label>
              <Select value={selectedHorseId || ""} onValueChange={setSelectedHorseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pferd wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name} {horse.breed && `(${horse.breed})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setIsCapturing(true)}
              disabled={!selectedHorseId}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Huffotos aufnehmen
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
