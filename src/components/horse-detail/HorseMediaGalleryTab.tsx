import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Image, X, ChevronLeft, ChevronRight, FileImage, Calendar, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getStorageUrl } from "@/lib/storage";

interface HorseMediaGalleryTabProps {
  horseId: string;
  horseName: string;
}

interface HoofPhoto {
  id: string;
  photo_url: string;
  hoof_position: string | null;
  notes: string | null;
  taken_at: string | null;
  created_at: string;
}

const HOOF_POSITIONS = [
  { value: "vl", label: "Vorne Links" },
  { value: "vr", label: "Vorne Rechts" },
  { value: "hl", label: "Hinten Links" },
  { value: "hr", label: "Hinten Rechts" },
  { value: "front", label: "Front-Ansicht" },
  { value: "side", label: "Seiten-Ansicht" },
  { value: "xray", label: "Röntgenbild" },
  { value: "other", label: "Sonstige" },
];

export function HorseMediaGalleryTab({ horseId, horseName }: HorseMediaGalleryTabProps) {
  const [photos, setPhotos] = useState<HoofPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPosition, setUploadPosition] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  useEffect(() => {
    fetchPhotos();
  }, [horseId]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
      
      // Fetch signed URLs for all photos
      const urls: Record<string, string> = {};
      for (const photo of data || []) {
        const url = await getStorageUrl("hoof_photos", photo.photo_url);
        if (url) urls[photo.id] = url;
      }
      setSignedUrls(urls);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Fehler beim Laden der Fotos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    setUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${horseId}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("hoof_photos")
        .upload(filePath, uploadFile);
        
      if (uploadError) throw uploadError;
      
      // Create database entry
      const { error: dbError } = await supabase
        .from("hoof_photos")
        .insert({
          horse_id: horseId,
          photo_url: filePath,
          hoof_position: uploadPosition || null,
          notes: uploadNotes || null,
          taken_at: new Date().toISOString(),
        });
        
      if (dbError) throw dbError;
      
      toast.success("Foto hochgeladen");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPosition("");
      setUploadNotes("");
      fetchPhotos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const getPositionLabel = (position: string | null) => {
    if (!position) return null;
    return HOOF_POSITIONS.find(p => p.value === position)?.label || position;
  };

  // Group photos by date
  const groupedPhotos = photos.reduce((acc, photo) => {
    const dateKey = photo.taken_at 
      ? format(new Date(photo.taken_at), "yyyy-MM-dd")
      : format(new Date(photo.created_at), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(photo);
    return acc;
  }, {} as Record<string, HoofPhoto[]>);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medien & Galerie</h3>
          <p className="text-sm text-muted-foreground">
            {photos.length} Foto{photos.length !== 1 ? 's' : ''} gespeichert
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Foto / Röntgenbild hochladen
        </Button>
      </div>

      {/* Gallery by Date */}
      {Object.keys(groupedPhotos).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Noch keine Fotos</p>
                <p className="text-sm text-muted-foreground">
                  Lade Huf-Fotos oder Röntgenbilder hoch
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                Erstes Foto hochladen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPhotos)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateKey, datePhotos]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(new Date(dateKey), "dd. MMMM yyyy", { locale: de })}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {datePhotos.length} Foto{datePhotos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {datePhotos.map((photo, idx) => (
                    <Card 
                      key={photo.id}
                      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                      onClick={() => setLightboxIndex(photos.indexOf(photo))}
                    >
                      <div className="aspect-square relative">
                        {signedUrls[photo.id] ? (
                          <img 
                            src={signedUrls[photo.id]} 
                            alt={`Huf-Foto ${photo.hoof_position || ''}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <FileImage className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Position Badge */}
                        {photo.hoof_position && (
                          <div className="absolute top-2 left-2">
                            <Badge className="text-xs bg-black/60 hover:bg-black/60">
                              {photo.hoof_position === 'xray' ? (
                                <span className="flex items-center gap-1">
                                  <FileImage className="h-3 w-3" />
                                  Röntgen
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Footprints className="h-3 w-3" />
                                  {photo.hoof_position.toUpperCase()}
                                </span>
                              )}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto / Röntgenbild hochladen</DialogTitle>
            <DialogDescription>
              Lade ein neues Huf-Foto oder Röntgenbild für {horseName} hoch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Bild auswählen</Label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground">
                  Ausgewählt: {uploadFile.name}
                </p>
              )}
            </div>
            
            {/* Position Select */}
            <div className="space-y-2">
              <Label>Huf / Typ (optional)</Label>
              <Select value={uploadPosition} onValueChange={setUploadPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Position auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {HOOF_POSITIONS.map(pos => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Input 
                placeholder="z.B. Nach Beschlag, Röntgen vom Tierarzt..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={!uploadFile || uploading}
              className="w-full"
            >
              {uploading ? "Wird hochgeladen..." : "Hochladen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black border-none">
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* Navigation */}
              {lightboxIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {lightboxIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
              
              {/* Image */}
              <div className="flex items-center justify-center min-h-[60vh]">
                {signedUrls[photos[lightboxIndex].id] && (
                  <img 
                    src={signedUrls[photos[lightboxIndex].id]} 
                    alt="Huf-Foto"
                    className="max-h-[80vh] max-w-full object-contain"
                  />
                )}
              </div>
              
              {/* Info bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {photos[lightboxIndex].hoof_position && (
                      <Badge className="bg-primary">
                        {getPositionLabel(photos[lightboxIndex].hoof_position)}
                      </Badge>
                    )}
                    <span className="text-sm text-white/70">
                      {photos[lightboxIndex].taken_at && format(
                        new Date(photos[lightboxIndex].taken_at), 
                        "dd.MM.yyyy HH:mm", 
                        { locale: de }
                      )}
                    </span>
                  </div>
                  <span className="text-sm text-white/50">
                    {lightboxIndex + 1} / {photos.length}
                  </span>
                </div>
                {photos[lightboxIndex].notes && (
                  <p className="text-sm text-white/80 mt-2">
                    {photos[lightboxIndex].notes}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}