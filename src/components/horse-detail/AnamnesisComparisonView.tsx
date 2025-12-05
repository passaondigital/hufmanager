import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AnamnesisComparisonViewProps {
  horseId: string;
  currentPhotos?: { url: string; position: string }[];
}

interface HoofPhotoSession {
  date: string;
  photos: {
    id: string;
    photo_url: string;
    hoof_position: string | null;
    taken_at: string | null;
  }[];
}

const HOOF_POSITIONS = [
  { key: "vl", label: "Vorne Links" },
  { key: "vr", label: "Vorne Rechts" },
  { key: "hl", label: "Hinten Links" },
  { key: "hr", label: "Hinten Rechts" },
];

export function AnamnesisComparisonView({ 
  horseId, 
  currentPhotos = [] 
}: AnamnesisComparisonViewProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  const { data: photoSessions = [] } = useQuery({
    queryKey: ["hoof-photo-sessions", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoof_photos")
        .select("id, photo_url, hoof_position, taken_at")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false });

      if (error) throw error;

      // Group photos by date (session)
      const sessions: Record<string, HoofPhotoSession> = {};
      
      for (const photo of data || []) {
        const dateKey = photo.taken_at 
          ? format(parseISO(photo.taken_at), "yyyy-MM-dd") 
          : "unknown";
        
        if (!sessions[dateKey]) {
          sessions[dateKey] = { date: dateKey, photos: [] };
        }
        sessions[dateKey].photos.push(photo);
      }

      return Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: showComparison,
  });

  const previousSession = photoSessions[selectedSessionIndex];
  const hasPreviousSessions = photoSessions.length > 0;

  if (!hasPreviousSessions && !showComparison) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Vorher / Nachher Vergleich
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Ausblenden
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Anzeigen
            </>
          )}
        </Button>
      </CardHeader>

      {showComparison && (
        <CardContent className="space-y-4">
          {!hasPreviousSessions ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine früheren Aufnahmen vorhanden.
            </p>
          ) : (
            <>
              {/* Session Navigator */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={selectedSessionIndex >= photoSessions.length - 1}
                  onClick={() => setSelectedSessionIndex(i => i + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Älter
                </Button>
                
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {previousSession?.date !== "unknown" 
                    ? format(parseISO(previousSession.date), "dd. MMMM yyyy", { locale: de })
                    : "Datum unbekannt"
                  }
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={selectedSessionIndex <= 0}
                  onClick={() => setSelectedSessionIndex(i => i - 1)}
                >
                  Neuer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-2 gap-4">
                {HOOF_POSITIONS.map(({ key, label }) => {
                  const previousPhoto = previousSession?.photos.find(
                    p => p.hoof_position?.toLowerCase() === key
                  );
                  const currentPhoto = currentPhotos.find(
                    p => p.position.toLowerCase() === key
                  );

                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs text-muted-foreground text-center font-medium">
                        {label}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {/* Previous Photo */}
                        <div className="relative">
                          <p className="text-[10px] text-muted-foreground absolute top-1 left-1 z-10 bg-background/80 px-1 rounded">
                            Vorher
                          </p>
                          {previousPhoto ? (
                            <img
                              src={previousPhoto.photo_url}
                              alt={`${label} vorher`}
                              className="w-full aspect-square object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted rounded-lg border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">—</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Current Photo */}
                        <div className="relative">
                          <p className="text-[10px] text-muted-foreground absolute top-1 left-1 z-10 bg-background/80 px-1 rounded">
                            Nachher
                          </p>
                          {currentPhoto ? (
                            <img
                              src={currentPhoto.url}
                              alt={`${label} nachher`}
                              className={cn(
                                "w-full aspect-square object-cover rounded-lg border-2",
                                "border-primary"
                              )}
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">Neu</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
