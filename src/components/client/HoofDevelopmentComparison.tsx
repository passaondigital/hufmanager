import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Camera } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface HoofPhoto {
  id: string;
  photo_url: string;
  hoof_position: string | null;
  taken_at: string;
  notes: string | null;
}

interface HoofDevelopmentComparisonProps {
  horseId: string;
  horseName: string;
}

export function HoofDevelopmentComparison({ horseId, horseName }: HoofDevelopmentComparisonProps) {
  const [photos, setPhotos] = useState<HoofPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<[string | null, string | null]>([null, null]);
  const [sliderPos, setSliderPos] = useState(50);

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from("hoof_photos")
        .select("id, photo_url, hoof_position, taken_at, notes")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false });

      setPhotos((data as HoofPhoto[]) || []);
      setLoading(false);
    };

    fetchPhotos();
  }, [horseId]);

  const handlePhotoSelect = (photoId: string) => {
    if (!compareMode) return;
    
    if (!selectedPhotos[0]) {
      setSelectedPhotos([photoId, null]);
    } else if (!selectedPhotos[1] && photoId !== selectedPhotos[0]) {
      setSelectedPhotos([selectedPhotos[0], photoId]);
    } else {
      setSelectedPhotos([photoId, null]);
    }
  };

  const getPhoto = (id: string | null) => photos.find((p) => p.id === id);
  const photo1 = getPhoto(selectedPhotos[0]);
  const photo2 = getPhoto(selectedPhotos[1]);

  if (loading) return null;

  if (photos.length < 2) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Mindestens 2 Huffotos nötig für den Vergleich.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compare toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          Huf-Entwicklung
        </h3>
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedPhotos([null, null]);
          }}
        >
          {compareMode ? "Fertig" : "Vergleichen"}
        </Button>
      </div>

      {/* Comparison view */}
      {compareMode && photo1 && photo2 && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square overflow-hidden">
              {/* After (background) */}
              <img
                src={photo2.photo_url}
                alt="Nachher"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Before (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={photo1.photo_url}
                  alt="Vorher"
                  className="w-full h-full object-cover"
                  style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }}
                />
              </div>
              {/* Slider */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <ArrowLeftRight className="h-4 w-4 text-foreground" />
                </div>
              </div>
              {/* Slider input */}
              <input
                type="range"
                min="5"
                max="95"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
              />
            </div>
            <div className="flex justify-between p-3 text-xs text-muted-foreground">
              <span>{format(new Date(photo1.taken_at), "dd.MM.yyyy", { locale: de })}</span>
              <span>{format(new Date(photo2.taken_at), "dd.MM.yyyy", { locale: de })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruction */}
      {compareMode && (!photo1 || !photo2) && (
        <p className="text-sm text-muted-foreground text-center">
          Wähle {!photo1 ? "das erste" : "das zweite"} Foto zum Vergleichen
        </p>
      )}

      {/* Photo timeline */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const isSelected = selectedPhotos.includes(photo.id);
          return (
            <div
              key={photo.id}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent"
              }`}
              onClick={() => handlePhotoSelect(photo.id)}
            >
              <img
                src={photo.photo_url}
                alt={`Huf ${photo.hoof_position || ""}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-1.5">
                <p className="text-[10px] text-white">
                  {format(new Date(photo.taken_at), "dd.MM.yy", { locale: de })}
                </p>
              </div>
              {isSelected && (
                <div className="absolute top-1 left-1">
                  <Badge className="text-[9px] h-5">{selectedPhotos[0] === photo.id ? "1" : "2"}</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
