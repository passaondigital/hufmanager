import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TabEntwicklungProps {
  horseId: string;
}

interface HoofPhoto {
  id: string;
  photo_url: string;
  hoof_position: string | null;
  taken_at: string | null;
  appointment_id: string | null;
  notes: string | null;
}

interface AppointmentWithPhotos {
  id: string;
  date: string;
  service_type: string | null;
  photos: HoofPhoto[];
}

const HOOF_LABELS: Record<string, string> = {
  vl: "Vorne Links",
  vr: "Vorne Rechts",
  hl: "Hinten Links",
  hr: "Hinten Rechts",
};

export function TabEntwicklung({ horseId }: TabEntwicklungProps) {
  const [selectedSession, setSelectedSession] = useState<number>(0);
  const [compareMode, setCompareMode] = useState(false);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Fetch hoof photos grouped by appointment
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["hoof-timeline", horseId],
    queryFn: async () => {
      // Get all hoof photos for this horse
      const { data: photos, error } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false });

      if (error) throw error;
      if (!photos || photos.length === 0) return [];

      // Get appointments for this horse
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, date, service_type")
        .eq("horse_id", horseId)
        .eq("status", "completed")
        .order("date", { ascending: false });

      // Group photos by appointment or date
      const sessionsMap = new Map<string, AppointmentWithPhotos>();

      photos.forEach((photo) => {
        const aptId = photo.appointment_id || "standalone";
        const apt = appointments?.find((a) => a.id === photo.appointment_id);
        const date = apt?.date || (photo.taken_at ? photo.taken_at.split("T")[0] : "unknown");

        if (!sessionsMap.has(aptId)) {
          sessionsMap.set(aptId, {
            id: aptId,
            date: date,
            service_type: apt?.service_type || "Dokumentation",
            photos: [],
          });
        }

        sessionsMap.get(aptId)!.photos.push(photo);
      });

      // Sort by date (newest first)
      return Array.from(sessionsMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Noch keine Entwicklungsfotos
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Nach jedem Termin dokumentiert dein Hufbearbeiter den Fortschritt mit Fotos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentSession = sessions[selectedSession];
  const previousSession = sessions[selectedSession + 1];

  // Group photos by hoof position for comparison
  const groupByHoof = (photos: HoofPhoto[]) => {
    const grouped: Record<string, HoofPhoto[]> = {};
    photos.forEach((photo) => {
      const pos = photo.hoof_position || "other";
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push(photo);
    });
    return grouped;
  };

  const currentGrouped = groupByHoof(currentSession?.photos || []);
  const previousGrouped = previousSession ? groupByHoof(previousSession.photos) : {};

  const handleImageLoad = (id: string) => {
    setImageLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleImageStart = (id: string) => {
    setImageLoading((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Huf-Entwicklung
            </CardTitle>
            {sessions.length > 1 && (
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
              >
                Vorher/Nachher
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Session Selector */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              disabled={selectedSession >= sessions.length - 1}
              onClick={() => setSelectedSession((s) => Math.min(s + 1, sessions.length - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <Badge variant="outline" className="mb-1">
                <Calendar className="h-3 w-3 mr-1" />
                {format(parseISO(currentSession.date), "dd. MMMM yyyy", { locale: de })}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {currentSession.service_type}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              disabled={selectedSession <= 0}
              onClick={() => setSelectedSession((s) => Math.max(s - 1, 0))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Session Counter */}
          <div className="flex justify-center gap-1.5 mb-4">
            {sessions.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedSession(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === selectedSession
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison or Single View */}
      {compareMode && previousSession ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Vergleich mit vorherigem Termin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(currentGrouped).map(([position, photos]) => (
              <div key={position} className="space-y-2">
                <h4 className="text-sm font-medium">
                  {HOOF_LABELS[position] || position}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* Previous (Vorher) */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center">Vorher</p>
                    {previousGrouped[position]?.[0] ? (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {imageLoading[previousGrouped[position][0].id] && (
                          <Skeleton className="absolute inset-0" />
                        )}
                        <img
                          src={previousGrouped[position][0].photo_url}
                          alt={`Vorher - ${HOOF_LABELS[position]}`}
                          className="w-full h-full object-cover"
                          onLoadStart={() => handleImageStart(previousGrouped[position][0].id)}
                          onLoad={() => handleImageLoad(previousGrouped[position][0].id)}
                        />
                        <Badge
                          variant="secondary"
                          className="absolute bottom-1 left-1 text-[10px] bg-background/80"
                        >
                          {format(parseISO(previousSession.date), "dd.MM.yy", { locale: de })}
                        </Badge>
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Kein Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Current (Nachher) */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center">Nachher</p>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      {imageLoading[photos[0].id] && (
                        <Skeleton className="absolute inset-0" />
                      )}
                      <img
                        src={photos[0].photo_url}
                        alt={`Nachher - ${HOOF_LABELS[position]}`}
                        className="w-full h-full object-cover"
                        onLoadStart={() => handleImageStart(photos[0].id)}
                        onLoad={() => handleImageLoad(photos[0].id)}
                      />
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 text-[10px] bg-background/80"
                      >
                        {format(parseISO(currentSession.date), "dd.MM.yy", { locale: de })}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              {currentSession.photos.map((photo) => (
                <div key={photo.id} className="space-y-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {imageLoading[photo.id] && (
                      <Skeleton className="absolute inset-0" />
                    )}
                    <img
                      src={photo.photo_url}
                      alt={HOOF_LABELS[photo.hoof_position || ""] || "Huf-Foto"}
                      className="w-full h-full object-cover"
                      onLoadStart={() => handleImageStart(photo.id)}
                      onLoad={() => handleImageLoad(photo.id)}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {HOOF_LABELS[photo.hoof_position || ""] || "Foto"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Dokumentations-Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.slice(0, 5).map((session, i) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(i)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                  i === selectedSession
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {session.photos[0] ? (
                    <img
                      src={session.photos[0].photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {format(parseISO(session.date), "dd. MMMM yyyy", { locale: de })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.photos.length} Fotos • {session.service_type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
