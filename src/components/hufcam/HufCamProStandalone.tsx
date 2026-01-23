import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Sparkles,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HufCamSession } from "./HufCamSession";
import { HufCamGalleryReport } from "./HufCamGalleryReport";

interface PhotoData {
  dataUrl: string;
  timestamp: Date;
  analysis?: {
    isAcceptable: boolean;
    score: number;
    feedback: string;
  };
}

interface HoofPhotos {
  [hoofId: string]: {
    [viewId: string]: PhotoData | null;
  };
}

export function HufCamProStandalone() {
  const { user } = useAuth();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [customHorseName, setCustomHorseName] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState<HoofPhotos | null>(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [showGallery, setShowGallery] = useState(false);

  // Fetch horses for the provider via access_grants
  const { data: horses = [], isLoading: isLoadingHorses } = useQuery({
    queryKey: ["provider-horses-hufcam", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get clients connected to this provider via access_grants
      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", user.id)
        .eq("is_active", true);

      if (!grants || grants.length === 0) return [];

      const clientIds = grants.map(g => g.client_id);
      const { data: horsesData } = await supabase
        .from("horses")
        .select("id, name, breed, owner_id")
        .in("owner_id", clientIds)
        .is("deleted_at", null)
        .order("name");

      // Fetch owner names separately
      if (horsesData && horsesData.length > 0) {
        const ownerIds = [...new Set(horsesData.map(h => h.owner_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        return horsesData.map(h => ({
          ...h,
          ownerName: profileMap.get(h.owner_id) || undefined,
        }));
      }

      return [];
    },
    enabled: !!user?.id,
  });

  const selectedHorse = horses.find((h: any) => h.id === selectedHorseId);
  const horseName = selectedHorse?.name || customHorseName || "Unbekanntes Pferd";
  const horseBreed = selectedHorse?.breed || undefined;
  const ownerName = selectedHorse?.ownerName || undefined;

  const handleStartSession = () => {
    if (!selectedHorseId && !customHorseName) {
      return;
    }
    setIsSessionActive(true);
  };

  const handleSessionComplete = (photos: HoofPhotos, notes: string) => {
    setSessionPhotos(photos);
    setSessionNotes(notes);
    setIsSessionActive(false);
    setShowGallery(true);
  };

  const handleSessionCancel = () => {
    setIsSessionActive(false);
  };

  const handleGalleryClose = () => {
    setShowGallery(false);
    // Reset for new session
    setSessionPhotos(null);
    setSessionNotes("");
    setSelectedHorseId(null);
    setCustomHorseName("");
  };

  if (isSessionActive) {
    return (
      <HufCamSession
        horseName={horseName}
        horseId={selectedHorseId || "custom"}
        horseBreed={horseBreed}
        ownerName={ownerName}
        onComplete={handleSessionComplete}
        onCancel={handleSessionCancel}
      />
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            HufCam Pro
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              KI-gestützt
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dokumentiere alle 4 Hufe mit 5 Ansichten pro Huf. Die KI analysiert automatisch die Bildqualität.
          </p>

          {/* Horse Selection */}
          <div className="space-y-3">
            <Label>Pferd auswählen</Label>
            
            {isLoadingHorses ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : horses.length > 0 ? (
              <Select
                value={selectedHorseId || ""}
                onValueChange={(value) => {
                  setSelectedHorseId(value);
                  setCustomHorseName("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pferd auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      🐴 {horse.name}
                      {horse.breed && (
                        <span className="text-muted-foreground ml-2">({horse.breed})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Keine Pferde gefunden. Gib einen Namen ein:
              </p>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">oder</span>
            </div>

            <Input
              placeholder="Pferdename eingeben..."
              value={customHorseName}
              onChange={(e) => {
                setCustomHorseName(e.target.value);
                setSelectedHorseId(null);
              }}
            />
          </div>

          {/* Start Button */}
          <Button
            className="w-full h-14 text-lg"
            onClick={handleStartSession}
            disabled={!selectedHorseId && !customHorseName}
          >
            <Camera className="h-6 w-6 mr-3" />
            Huf-Doku starten
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>

          {/* Features List */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Features:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ 5 Ansichten pro Huf (Dorsal, Lateral, Medial, Solar, Palmar)</li>
              <li>✓ KI-Bildanalyse in Echtzeit</li>
              <li>✓ Automatische Metadaten-Einbrennung</li>
              <li>✓ Instagram-ready Collage-Generator</li>
              <li>✓ E-Mail-Vorlage für Hufbearbeiter</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Report Modal */}
      {sessionPhotos && (
        <HufCamGalleryReport
          isOpen={showGallery}
          onClose={handleGalleryClose}
          photos={sessionPhotos}
          notes={sessionNotes}
          horseName={horseName}
          horseBreed={horseBreed}
          ownerName={ownerName}
        />
      )}
    </>
  );
}
