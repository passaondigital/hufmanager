import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Calendar, ChevronLeft, ChevronRight, Loader2, Download, Grid } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl, uploadFile } from "@/lib/storage";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
};

export function HoofPhotoTimeline({ horseId, horseName }: HoofPhotoTimelineProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<HoofPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  
  const queryClient = useQueryClient();

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

  // Separate collages from regular photos
  const collages = photos.filter(p => p.notes === 'collage');
  const regularPhotos = photos.filter(p => p.notes !== 'collage');

  // Check if we have all 4 hoof positions for collage
  const positions = ['vl', 'vr', 'hl', 'hr'];
  const photosPerPosition = positions.reduce((acc, pos) => {
    acc[pos] = regularPhotos.filter(p => p.hoof_position === pos);
    return acc;
  }, {} as Record<string, HoofPhoto[]>);
  
  const canCreateCollage = positions.every(pos => photosPerPosition[pos].length > 0);

  // Group photos by date
  const groupedPhotos = regularPhotos.reduce((groups, photo) => {
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

  // Create 2x2 collage from the latest photo of each position
  const createCollage = async () => {
    if (!canCreateCollage) {
      toast.error('Es fehlen noch Fotos für einige Hufpositionen');
      return;
    }

    setIsCreatingCollage(true);
    toast.info('Collage wird erstellt...');

    try {
      // Get latest photo for each position
      const latestPhotos = positions.map(pos => photosPerPosition[pos][0]);

      // Load images
      const loadImage = async (photo: HoofPhoto): Promise<HTMLImageElement> => {
        const url = await getStorageUrl('hoof_photos', photo.photo_url);
        if (!url) throw new Error('URL nicht verfügbar');

        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            resolve(img);
          };
          img.onerror = reject;
          img.src = objUrl;
        });
      };

      const images = await Promise.all(latestPhotos.map(loadImage));

      // Create 2048x2048 canvas
      const size = 2048;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Draw 2x2 grid
      const half = size / 2;
      const positionOrder = ['vl', 'vr', 'hl', 'hr']; // Top-left, Top-right, Bottom-left, Bottom-right
      
      positionOrder.forEach((pos, i) => {
        const img = images[positions.indexOf(pos)];
        const x = (i % 2) * half;
        const y = Math.floor(i / 2) * half;
        
        // Cover strategy
        const ratio = Math.max(half / img.width, half / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const dx = x + (half - w) / 2;
        const dy = y + (half - h) / 2;
        
        ctx.drawImage(img, dx, dy, w, h);

        // Add position label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, 120, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(HOOF_POSITION_LABELS[pos] || pos.toUpperCase(), x + 10, y + 28);
      });

      // Add horse name header
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, size - 60, size, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${horseName || 'Pferd'} - ${format(new Date(), 'dd.MM.yyyy')}`,
        size / 2,
        size - 20
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob creation failed')), 'image/jpeg', 0.9);
      });

      // Upload to storage
      const filename = `collage_${horseId}_${Date.now()}.jpg`;
      const path = `hoof_photos/collages/${filename}`;
      
      const { path: uploadedPath, error: uploadErr } = await uploadFile('hoof_photos', path, blob, { upsert: true });
      if (uploadErr || !uploadedPath) {
        throw new Error('Upload fehlgeschlagen');
      }

      // Save file path (not full URL) to database - getStorageUrl will create signed URLs
      const { error: dbErr } = await supabase.from('hoof_photos').insert({
        horse_id: horseId,
        photo_url: uploadedPath,  // Store path, not full URL
        hoof_position: 'all',
        notes: 'collage',
        taken_at: new Date().toISOString(),
      });

      if (dbErr) throw dbErr;

      toast.success('Collage erstellt!');
      queryClient.invalidateQueries({ queryKey: ['hoof-photos-timeline', horseId] });

    } catch (err) {
      console.error('Collage creation failed', err);
      toast.error('Collage konnte nicht erstellt werden');
    } finally {
      setIsCreatingCollage(false);
    }
  };

  // Download a photo
  const downloadPhoto = async (photo: HoofPhoto) => {
    try {
      const url = await getStorageUrl('hoof_photos', photo.photo_url);
      if (!url) {
        toast.error('URL nicht verfügbar');
        return;
      }

      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `hoof_${photo.hoof_position || 'photo'}_${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download gestartet');
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Download fehlgeschlagen');
    }
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
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Camera className="h-4 w-4 text-primary" />
            Foto-Timeline
            <Badge variant="secondary" className="ml-auto">
              {photos.length} Fotos
            </Badge>
          </CardTitle>
          
          {/* Collage button */}
          {canCreateCollage && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={createCollage}
              disabled={isCreatingCollage}
              className="mt-2 gap-2"
            >
              <Grid className="h-4 w-4" />
              {isCreatingCollage ? 'Erstelle...' : 'Collage erstellen'}
            </Button>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Show collages at top */}
          {collages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Collagen
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {collages.map((photo) => (
                  <TimelinePhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    onClick={() => handlePhotoClick(photo)}
                    isCollage
                  />
                ))}
              </div>
            </div>
          )}

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
                  {selectedPhoto.notes === 'collage' 
                    ? 'Collage' 
                    : HOOF_POSITION_LABELS[selectedPhoto.hoof_position] || selectedPhoto.hoof_position}
                </Badge>
              )}
              <span className="text-muted-foreground text-sm font-normal">
                {selectedPhoto?.taken_at && format(parseISO(selectedPhoto.taken_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </span>
              {selectedPhoto && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadPhoto(selectedPhoto)}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
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
            
            {selectedPhoto && <LightboxImage photo={selectedPhoto} />}
          </div>

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
  onClick,
  isCollage = false,
}: { 
  photo: HoofPhoto; 
  onClick: () => void;
  isCollage?: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    getStorageUrl("hoof_photos", photo.photo_url).then(setSignedUrl);
  }, [photo.photo_url]);

  return (
    <div 
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer",
        "hover:ring-2 hover:ring-primary transition-all",
        isCollage && "col-span-2 row-span-2"
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
      {photo.hoof_position && !isCollage && (
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white uppercase">
          {photo.hoof_position}
        </div>
      )}
      {isCollage && (
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary/80 rounded text-[10px] text-primary-foreground">
          Collage
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
