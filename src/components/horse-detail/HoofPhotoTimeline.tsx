import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Calendar, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storage";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HoofPhoto {
  id: string;
  horse_id: string;
  photo_url: string;
  hoof_position: string | null;
  notes: string | null;
  taken_at: string | null;
  created_at: string;
}

interface HoofPhotoTimelineProps {
  horseId: string;
  horseName?: string;
}

const HOOF_POSITION_LABELS: Record<string, string> = {
  vl: "Vorne Links",
  vr: "Vorne Rechts",
  hl: "Hinten Links",
  hr: "Hinten Rechts",
  vl_front: "VL Vorne",
  vl_side: "VL Seite",
  vl_sole: "VL Sohle",
  vr_front: "VR Vorne",
  vr_side: "VR Seite",
  vr_sole: "VR Sohle",
  hl_front: "HL Vorne",
  hl_side: "HL Seite",
  hl_sole: "HL Sohle",
  hr_front: "HR Vorne",
  hr_side: "HR Seite",
  hr_sole: "HR Sohle",
};

export function HoofPhotoTimeline({ horseId, horseName }: HoofPhotoTimelineProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<HoofPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["hoof-photos-timeline", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false });
      
      if (error) throw error;
      return data as HoofPhoto[];
    },
  });

  // Group photos by date
  const groupedPhotos = photos.reduce((groups, photo) => {
    const dateKey = photo.taken_at 
      ? format(parseISO(photo.taken_at), "yyyy-MM-dd")
      : format(parseISO(photo.created_at), "yyyy-MM-dd");
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
    return groups;
  }, {} as Record<string, HoofPhoto[]>);

  const sortedDates = Object.keys(groupedPhotos).sort((a, b) => b.localeCompare(a));

  const handlePhotoClick = (photo: HoofPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setLightboxIndex(index);
    setSelectedPhoto(photo);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" 
      ? (lightboxIndex - 1 + photos.length) % photos.length
      : (lightboxIndex + 1) % photos.length;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Noch keine Huf-Fotos</p>
          <p className="text-sm mt-1">
            Fotos werden über HufCam Pro automatisch hinzugefügt
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Foto-Timeline
            <Badge variant="secondary" className="ml-auto">
              {photos.length} Fotos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey} className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />
                  
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="font-medium text-sm">
                      {format(parseISO(dateKey), "EEEE, dd. MMMM yyyy", { locale: de })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {groupedPhotos[dateKey].length} Fotos
                    </Badge>
                  </div>

                  {/* Photos grid */}
                  <div className="ml-9 grid grid-cols-4 gap-2">
                    {groupedPhotos[dateKey].map((photo) => (
                      <TimelinePhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onClick={() => handlePhotoClick(photo)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedPhoto?.hoof_position && (
                <Badge variant="secondary">
                  {HOOF_POSITION_LABELS[selectedPhoto.hoof_position] || selectedPhoto.hoof_position}
                </Badge>
              )}
              <span className="text-muted-foreground text-sm font-normal">
                {selectedPhoto?.taken_at && format(parseISO(selectedPhoto.taken_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                  onClick={() => navigateLightbox("prev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                  onClick={() => navigateLightbox("next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            {selectedPhoto && (
              <LightboxImage photo={selectedPhoto} />
            )}
          </div>

          {selectedPhoto?.notes && (
            <div className="p-4 pt-0">
              <p className="text-sm text-muted-foreground">{selectedPhoto.notes}</p>
            </div>
          )}

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Thumbnail component with signed URL
function TimelinePhotoThumbnail({ 
  photo, 
  onClick 
}: { 
  photo: HoofPhoto; 
  onClick: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    getStorageUrl("hoof_photos", photo.photo_url).then(setSignedUrl);
  }, [photo.photo_url]);

  return (
    <div 
      className={cn(
        "aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer",
        "hover:ring-2 hover:ring-primary transition-all"
      )}
      onClick={onClick}
    >
      {signedUrl ? (
        <img 
          src={signedUrl} 
          alt={photo.hoof_position || "Huf-Foto"} 
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {photo.hoof_position && (
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white uppercase">
          {photo.hoof_position.split("_")[0]}
        </div>
      )}
    </div>
  );
}

// Lightbox image with signed URL
function LightboxImage({ photo }: { photo: HoofPhoto }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    getStorageUrl("hoof_photos", photo.photo_url).then(setSignedUrl);
  }, [photo.photo_url]);

  if (!signedUrl) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt={photo.hoof_position || "Huf-Foto"} 
      className="w-full max-h-[70vh] object-contain bg-black/5"
    />
  );
}
