import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storage";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface CustomerGalleryPreviewProps {
  horseIds: string[];
}

interface RecentPhoto {
  id: string;
  photo_url: string;
  horse_id: string;
  horse_name: string;
  hoof_position: string | null;
  taken_at: string | null;
  created_at: string;
}

export function CustomerGalleryPreview({ horseIds }: CustomerGalleryPreviewProps) {
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (horseIds.length === 0) {
      setLoading(false);
      return;
    }
    
    fetchRecentPhotos();
  }, [horseIds]);

  const fetchRecentPhotos = async () => {
    try {
      // Fetch recent photos for all horses
      const { data: photosData, error: photosError } = await supabase
        .from("hoof_photos")
        .select("id, photo_url, horse_id, hoof_position, taken_at, created_at")
        .in("horse_id", horseIds)
        .order("taken_at", { ascending: false })
        .limit(4);

      if (photosError) throw photosError;

      // Fetch horse names
      const { data: horsesData } = await supabase
        .from("horses")
        .select("id, name")
        .in("id", horseIds);

      const horseNameMap = (horsesData || []).reduce((acc, h) => {
        acc[h.id] = h.name;
        return acc;
      }, {} as Record<string, string>);

      const enrichedPhotos = (photosData || []).map(photo => ({
        ...photo,
        horse_name: horseNameMap[photo.horse_id] || "Unbekannt",
      }));

      setPhotos(enrichedPhotos);

      // Fetch signed URLs
      const urls: Record<string, string> = {};
      for (const photo of enrichedPhotos) {
        const url = await getStorageUrl("hoof_photos", photo.photo_url);
        if (url) urls[photo.id] = url;
      }
      setSignedUrls(urls);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            Neueste Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Fotos vorhanden</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            Neueste Uploads
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {photos.length} Bilder
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer"
            >
              {signedUrls[photo.id] ? (
                <img 
                  src={signedUrls[photo.id]} 
                  alt={`${photo.horse_name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="text-white text-xs">
                  <p className="font-medium truncate">{photo.horse_name}</p>
                  {photo.taken_at && (
                    <p className="opacity-75">
                      {format(new Date(photo.taken_at), "dd.MM", { locale: de })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* View all indicator */}
        <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
          <span>Alle Fotos in den Pferde-Akten</span>
          <ChevronRight className="h-3 w-3 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}