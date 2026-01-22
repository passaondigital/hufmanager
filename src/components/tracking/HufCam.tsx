import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Download,
  Share2,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HoofPhoto {
  position: "VL" | "VR" | "HL" | "HR";
  label: string;
  dataUrl: string | null;
}

interface HufCamProps {
  horseName: string;
  horseId: string;
  onCollageGenerated?: (collageDataUrl: string) => void;
}

const HOOF_POSITIONS: { position: HoofPhoto["position"]; label: string; fullLabel: string }[] = [
  { position: "VL", label: "VL", fullLabel: "Vorne Links" },
  { position: "VR", label: "VR", fullLabel: "Vorne Rechts" },
  { position: "HL", label: "HL", fullLabel: "Hinten Links" },
  { position: "HR", label: "HR", fullLabel: "Hinten Rechts" },
];

export function HufCam({ horseName, horseId, onCollageGenerated }: HufCamProps) {
  const [photos, setPhotos] = useState<Record<string, string | null>>({
    VL: null,
    VR: null,
    HL: null,
    HR: null,
  });
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handlePhotoCapture = (position: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    setActiveUpload(position);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotos(prev => ({ ...prev, [position]: dataUrl }));
      setActiveUpload(null);
      setCollageUrl(null); // Reset collage when new photo is added
    };
    reader.onerror = () => {
      toast.error("Fehler beim Laden des Bildes");
      setActiveUpload(null);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (position: string) => {
    setPhotos(prev => ({ ...prev, [position]: null }));
    setCollageUrl(null);
  };

  const photoCount = Object.values(photos).filter(Boolean).length;
  const canGenerateCollage = photoCount >= 2;

  const generateCollage = useCallback(async () => {
    if (!canGenerateCollage) return;

    setIsGenerating(true);

    try {
      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // Collage dimensions (Instagram square)
      const collageSize = 1080;
      const padding = 20;
      const headerHeight = 80;
      const footerHeight = 60;
      const photoAreaHeight = collageSize - headerHeight - footerHeight;
      
      canvas.width = collageSize;
      canvas.height = collageSize;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, collageSize);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(1, "#0d0d0d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, collageSize, collageSize);

      // Header with horse name
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 36px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(horseName, collageSize / 2, 50);

      // Get photos that exist
      const existingPhotos = HOOF_POSITIONS
        .filter(p => photos[p.position])
        .map(p => ({ ...p, dataUrl: photos[p.position]! }));

      // Calculate grid layout
      const cols = existingPhotos.length <= 2 ? existingPhotos.length : 2;
      const rows = Math.ceil(existingPhotos.length / cols);
      const photoWidth = (collageSize - padding * (cols + 1)) / cols;
      const photoHeight = (photoAreaHeight - padding * (rows + 1)) / rows;

      // Load and draw photos
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      for (let i = 0; i < existingPhotos.length; i++) {
        const photo = existingPhotos[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = padding + col * (photoWidth + padding);
        const y = headerHeight + padding + row * (photoHeight + padding);

        try {
          const img = await loadImage(photo.dataUrl);
          
          // Draw rounded rectangle background
          ctx.fillStyle = "#2a2a2a";
          roundRect(ctx, x, y, photoWidth, photoHeight, 12);
          ctx.fill();

          // Calculate crop to fill (cover)
          const imgAspect = img.width / img.height;
          const boxAspect = photoWidth / photoHeight;
          
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          
          if (imgAspect > boxAspect) {
            sw = img.height * boxAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / boxAspect;
            sy = (img.height - sh) / 2;
          }

          // Clip to rounded rectangle
          ctx.save();
          roundRect(ctx, x, y, photoWidth, photoHeight, 12);
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
          ctx.restore();

          // Position label
          ctx.fillStyle = "rgba(244, 123, 32, 0.9)";
          const labelWidth = 50;
          const labelHeight = 30;
          roundRect(ctx, x + 10, y + 10, labelWidth, labelHeight, 6);
          ctx.fill();
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px 'Outfit', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(photo.label, x + 10 + labelWidth / 2, y + 10 + labelHeight / 2 + 5);

        } catch (err) {
          console.error("Error loading image:", err);
        }
      }

      // Footer with timestamp and branding
      const now = new Date();
      const timestamp = now.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const time = now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      ctx.fillStyle = "#666666";
      ctx.font = "16px 'Outfit', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`📅 ${timestamp} • ${time}`, padding, collageSize - 25);

      ctx.textAlign = "right";
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 16px 'Outfit', sans-serif";
      ctx.fillText("HufManager.de", collageSize - padding, collageSize - 25);

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCollageUrl(dataUrl);
      onCollageGenerated?.(dataUrl);
      toast.success("Collage erstellt!", {
        description: "Bereit zum Teilen auf Social Media",
      });

    } catch (error) {
      console.error("Error generating collage:", error);
      toast.error("Fehler beim Erstellen der Collage");
    } finally {
      setIsGenerating(false);
    }
  }, [photos, horseName, canGenerateCollage, onCollageGenerated]);

  const downloadCollage = () => {
    if (!collageUrl) return;

    const link = document.createElement("a");
    link.download = `${horseName.replace(/\s+/g, "_")}_Hufe_${new Date().toISOString().split("T")[0]}.jpg`;
    link.href = collageUrl;
    link.click();
    toast.success("Collage heruntergeladen");
  };

  const shareCollage = async () => {
    if (!collageUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(collageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${horseName}_Hufe.jpg`, { type: "image/jpeg" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${horseName} - Huf-Dokumentation`,
          text: `Huf-Dokumentation für ${horseName} #HufManager`,
        });
      } else {
        // Fallback: copy to clipboard or download
        downloadCollage();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Teilen fehlgeschlagen");
        downloadCollage();
      }
    }
  };

  const resetAll = () => {
    setPhotos({ VL: null, VR: null, HL: null, HR: null });
    setCollageUrl(null);
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" />
            HufCam
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {photoCount}/4 Fotos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo Grid */}
        <div className="grid grid-cols-2 gap-3">
          {HOOF_POSITIONS.map(({ position, label, fullLabel }) => (
            <div key={position} className="relative">
              <input
                ref={el => fileInputRefs.current[position] = el}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture(position)}
              />
              
              {photos[position] ? (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-card">
                  <img 
                    src={photos[position]!} 
                    alt={fullLabel}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold"
                  >
                    {label}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => removePhoto(position)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 right-2">
                    <Check className="h-5 w-5 text-green-500 drop-shadow-lg" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs.current[position]?.click()}
                  disabled={activeUpload === position}
                  className={cn(
                    "w-full aspect-square rounded-xl border-2 border-dashed transition-all",
                    "flex flex-col items-center justify-center gap-2",
                    "hover:border-primary hover:bg-primary/5",
                    activeUpload === position 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-muted/30"
                  )}
                >
                  {activeUpload === position ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground/70">{fullLabel}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <Button
          className="w-full h-12"
          disabled={!canGenerateCollage || isGenerating}
          onClick={generateCollage}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Erstelle Collage...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Collage erstellen
            </>
          )}
        </Button>

        {/* Collage Preview */}
        {collageUrl && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground">Fertige Collage</p>
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img 
                src={collageUrl} 
                alt="Huf-Collage"
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadCollage}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                className="flex-1"
                onClick={shareCollage}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Teilen
              </Button>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {photoCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={resetAll}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Alle Fotos löschen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function for rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
