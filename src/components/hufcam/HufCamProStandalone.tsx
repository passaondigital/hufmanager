import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  ClipboardList,
  Image,
  Calendar,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HufCamSession } from "./HufCamSession";
import { HufCamGalleryReport } from "./HufCamGalleryReport";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getStorageUrl } from "@/lib/storage";

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

  // Fetch hoof analyses for selected horse
  const { data: hoofAnalyses = [], isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["horse-hoof-analyses", selectedHorseId],
    queryFn: async () => {
      if (!selectedHorseId) return [];
      
      const { data } = await supabase
        .from("hoof_analyses")
        .select("id, created_at, status, notes, recommendations")
        .eq("horse_id", selectedHorseId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: !!selectedHorseId,
  });

  // Fetch documents for selected horse
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ["horse-documents-hufcam", selectedHorseId],
    queryFn: async () => {
      if (!selectedHorseId) return [];
      
      const { data } = await supabase
        .from("horse_documents")
        .select("id, file_name, file_url, file_type, category, created_at, notes")
        .eq("horse_id", selectedHorseId)
        .order("created_at", { ascending: false })
        .limit(20);
      
      return data || [];
    },
    enabled: !!selectedHorseId,
  });

  // Fetch hoof photos for selected horse
  const { data: hoofPhotos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["horse-hoof-photos", selectedHorseId],
    queryFn: async () => {
      if (!selectedHorseId) return [];
      
      const { data } = await supabase
        .from("hoof_photos")
        .select("id, photo_url, hoof_position, taken_at, notes")
        .eq("horse_id", selectedHorseId)
        .order("taken_at", { ascending: false })
        .limit(20);
      
      // Get signed URLs for photos
      if (data) {
        const photosWithUrls = await Promise.all(
          data.map(async (photo) => {
            const url = await getStorageUrl("hoof_photos", photo.photo_url);
            return { ...photo, signedUrl: url };
          })
        );
        return photosWithUrls;
      }
      
      return [];
    },
    enabled: !!selectedHorseId,
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

  const openDocument = async (fileUrl: string) => {
    const url = await getStorageUrl("horse-documents", fileUrl);
    if (url) window.open(url, "_blank");
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

      {/* Horse Documents & Analyses Panel - only show when horse is selected */}
      {selectedHorseId && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Unterlagen: {selectedHorse?.name}
            </CardTitle>
            <CardDescription>
              Analysebögen, Dokumente und Huf-Fotos dieses Pferdes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analyses" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="analyses" className="text-xs gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Analysen ({hoofAnalyses.length})
                </TabsTrigger>
                <TabsTrigger value="photos" className="text-xs gap-1">
                  <Image className="h-3 w-3" />
                  Fotos ({hoofPhotos.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs gap-1">
                  <FileText className="h-3 w-3" />
                  Dokumente ({documents.length})
                </TabsTrigger>
              </TabsList>

              {/* Hoof Analyses Tab */}
              <TabsContent value="analyses">
                {isLoadingAnalyses ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : hoofAnalyses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Noch keine Hufanalysen vorhanden
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {hoofAnalyses.map((analysis) => (
                        <div
                          key={analysis.id}
                          className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <ClipboardList className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Hufanalyse-Bogen
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(analysis.created_at), "dd.MM.yyyy", { locale: de })}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={analysis.status === "completed" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {analysis.status === "completed" ? "Fertig" : "Entwurf"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Hoof Photos Tab */}
              <TabsContent value="photos">
                {isLoadingPhotos ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : hoofPhotos.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Noch keine Huf-Fotos vorhanden
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-4 gap-2">
                      {hoofPhotos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer group"
                          onClick={() => photo.signedUrl && window.open(photo.signedUrl, "_blank")}
                        >
                          <img
                            src={photo.signedUrl || photo.photo_url}
                            alt={photo.hoof_position || "Huf"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                          {photo.hoof_position && (
                            <Badge 
                              variant="secondary" 
                              className="absolute bottom-1 left-1 text-[10px] px-1"
                            >
                              {photo.hoof_position}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents">
                {isLoadingDocs ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Noch keine Dokumente vorhanden
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => openDocument(doc.file_url)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <FileText className="h-4 w-4 text-secondary-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[180px]">
                                {doc.file_name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                              </div>
                            </div>
                          </div>
                          {doc.category && (
                            <Badge variant="outline" className="text-xs">
                              {doc.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

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
