import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Download,
  Share2,
  RotateCcw,
  Loader2,
  X,
  Check,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  Footprints,
  CircleDot,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Hoof positions in wizard order
const HOOF_POSITIONS = [
  { position: "VL", label: "VL", fullLabel: "Vorne Links" },
  { position: "VR", label: "VR", fullLabel: "Vorne Rechts" },
  { position: "HL", label: "HL", fullLabel: "Hinten Links" },
  { position: "HR", label: "HR", fullLabel: "Hinten Rechts" },
] as const;

// Photo angles per hoof
const PHOTO_ANGLES = [
  { id: "dorsal", label: "Dorsal", icon: Eye, description: "Ansicht von vorne" },
  { id: "lateral", label: "Lateral", icon: Target, description: "Seitenansicht" },
  { id: "sole", label: "Sohle", icon: Footprints, description: "Ansicht von unten" },
  { id: "frog", label: "Strahl/Ballen", icon: CircleDot, description: "Strahl & Ballen" },
] as const;

type HoofPosition = typeof HOOF_POSITIONS[number]["position"];
type PhotoAngle = typeof PHOTO_ANGLES[number]["id"];

interface HoofPhotos {
  [key: string]: {
    [angle: string]: string | null;
  };
}

interface HufCamProProps {
  horseName: string;
  horseId: string;
  providerLogo?: string | null;
  onCollageGenerated?: (collageDataUrl: string) => void;
  onPhotosComplete?: (photos: HoofPhotos) => void;
}

export function HufCamPro({ 
  horseName, 
  horseId, 
  providerLogo,
  onCollageGenerated,
  onPhotosComplete 
}: HufCamProProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentHoofIndex, setCurrentHoofIndex] = useState(0);
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [photos, setPhotos] = useState<HoofPhotos>(() => {
    const initial: HoofPhotos = {};
    HOOF_POSITIONS.forEach(({ position }) => {
      initial[position] = {};
      PHOTO_ANGLES.forEach(({ id }) => {
        initial[position][id] = null;
      });
    });
    return initial;
  });
  const [showGuides, setShowGuides] = useState(true);
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentHoof = HOOF_POSITIONS[currentHoofIndex];
  const currentAngle = PHOTO_ANGLES[currentAngleIndex];
  const totalSteps = HOOF_POSITIONS.length * PHOTO_ANGLES.length;
  const currentStep = currentHoofIndex * PHOTO_ANGLES.length + currentAngleIndex + 1;
  const progress = (currentStep / totalSteps) * 100;

  // Count total photos taken
  const photoCount = Object.values(photos).reduce((count, hoofPhotos) => {
    return count + Object.values(hoofPhotos).filter(Boolean).length;
  }, 0);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotos((prev) => ({
        ...prev,
        [currentHoof.position]: {
          ...prev[currentHoof.position],
          [currentAngle.id]: dataUrl,
        },
      }));
      
      // Auto-advance to next step
      setTimeout(() => {
        if (currentAngleIndex < PHOTO_ANGLES.length - 1) {
          setCurrentAngleIndex((prev) => prev + 1);
        } else if (currentHoofIndex < HOOF_POSITIONS.length - 1) {
          setCurrentHoofIndex((prev) => prev + 1);
          setCurrentAngleIndex(0);
        }
      }, 300);
    };
    reader.onerror = () => {
      toast.error("Fehler beim Laden des Bildes");
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const goBack = () => {
    if (currentAngleIndex > 0) {
      setCurrentAngleIndex((prev) => prev - 1);
    } else if (currentHoofIndex > 0) {
      setCurrentHoofIndex((prev) => prev - 1);
      setCurrentAngleIndex(PHOTO_ANGLES.length - 1);
    }
  };

  const goNext = () => {
    if (currentAngleIndex < PHOTO_ANGLES.length - 1) {
      setCurrentAngleIndex((prev) => prev + 1);
    } else if (currentHoofIndex < HOOF_POSITIONS.length - 1) {
      setCurrentHoofIndex((prev) => prev + 1);
      setCurrentAngleIndex(0);
    }
  };

  const skipToHoof = (hoofIndex: number) => {
    setCurrentHoofIndex(hoofIndex);
    setCurrentAngleIndex(0);
  };

  const removeCurrentPhoto = () => {
    setPhotos((prev) => ({
      ...prev,
      [currentHoof.position]: {
        ...prev[currentHoof.position],
        [currentAngle.id]: null,
      },
    }));
  };

  const generateCollage = useCallback(async () => {
    if (photoCount < 4) {
      toast.error("Mindestens 4 Fotos erforderlich");
      return;
    }

    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // Instagram-optimized dimensions
      const collageSize = 1080;
      const padding = 16;
      const headerHeight = 70;
      const footerHeight = 50;
      const photoAreaHeight = collageSize - headerHeight - footerHeight;

      canvas.width = collageSize;
      canvas.height = collageSize;

      // Dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, collageSize);
      gradient.addColorStop(0, "#0a0a0a");
      gradient.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, collageSize, collageSize);

      // Accent line at top
      ctx.fillStyle = "#F47B20";
      ctx.fillRect(0, 0, collageSize, 4);

      // Header - Horse name
      ctx.font = "bold 32px 'Outfit', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(`🐴 ${horseName}`, padding + 10, 48);

      // Date badge
      const now = new Date();
      const dateStr = now.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      ctx.font = "16px 'Outfit', sans-serif";
      ctx.fillStyle = "#888888";
      ctx.textAlign = "right";
      ctx.fillText(dateStr, collageSize - padding - 10, 48);

      // Collect all photos
      const allPhotos: { position: string; angle: string; dataUrl: string }[] = [];
      Object.entries(photos).forEach(([position, angles]) => {
        Object.entries(angles).forEach(([angle, dataUrl]) => {
          if (dataUrl) {
            allPhotos.push({ position, angle, dataUrl });
          }
        });
      });

      // Calculate grid layout
      const cols = allPhotos.length <= 4 ? 2 : allPhotos.length <= 6 ? 3 : 4;
      const rows = Math.ceil(allPhotos.length / cols);
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

      for (let i = 0; i < allPhotos.length; i++) {
        const photo = allPhotos[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = padding + col * (photoWidth + padding);
        const y = headerHeight + padding + row * (photoHeight + padding);

        try {
          const img = await loadImage(photo.dataUrl);

          // Rounded rectangle clip
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, photoWidth, photoHeight, 10);
          ctx.clip();

          // Draw image (cover fit)
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

          ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
          ctx.restore();

          // Position label
          const labelText = `${photo.position}`;
          ctx.fillStyle = "rgba(244, 123, 32, 0.95)";
          const labelWidth = 44;
          const labelHeight = 28;
          ctx.beginPath();
          ctx.roundRect(x + 8, y + 8, labelWidth, labelHeight, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px 'Outfit', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(labelText, x + 8 + labelWidth / 2, y + 8 + labelHeight / 2 + 5);

          // Angle label (small, bottom right)
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.font = "12px 'Outfit', sans-serif";
          ctx.textAlign = "right";
          const angleLabel = PHOTO_ANGLES.find(a => a.id === photo.angle)?.label || photo.angle;
          ctx.fillText(angleLabel, x + photoWidth - 8, y + photoHeight - 8);
        } catch (err) {
          console.error("Error loading image:", err);
        }
      }

      // Footer
      ctx.fillStyle = "#444444";
      ctx.font = "14px 'Outfit', sans-serif";
      ctx.textAlign = "left";
      const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      ctx.fillText(`📅 ${dateStr} • ${time}`, padding + 10, collageSize - 18);

      ctx.textAlign = "right";
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 16px 'Outfit', sans-serif";
      ctx.fillText("HufManager.de", collageSize - padding - 10, collageSize - 18);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCollageUrl(dataUrl);
      onCollageGenerated?.(dataUrl);
      onPhotosComplete?.(photos);
      setIsWizardOpen(false);
      toast.success("Collage erstellt!", {
        description: "Bereit zum Teilen auf Social Media",
      });
    } catch (error) {
      console.error("Error generating collage:", error);
      toast.error("Fehler beim Erstellen der Collage");
    } finally {
      setIsGenerating(false);
    }
  }, [photos, horseName, photoCount, onCollageGenerated, onPhotosComplete]);

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
    const initial: HoofPhotos = {};
    HOOF_POSITIONS.forEach(({ position }) => {
      initial[position] = {};
      PHOTO_ANGLES.forEach(({ id }) => {
        initial[position][id] = null;
      });
    });
    setPhotos(initial);
    setCollageUrl(null);
    setCurrentHoofIndex(0);
    setCurrentAngleIndex(0);
  };

  const currentPhoto = photos[currentHoof.position][currentAngle.id];

  return (
    <>
      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-primary" />
              HufCam Pro
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              {photoCount}/{totalSteps} Fotos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Start Wizard Button */}
          <Button
            className="w-full h-14 text-lg gap-3"
            onClick={() => setIsWizardOpen(true)}
          >
            <Camera className="h-6 w-6" />
            Huf-Doku starten
          </Button>

          {/* Quick Preview Grid */}
          {photoCount > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {HOOF_POSITIONS.map(({ position, label }) => {
                const hoofPhotoCount = Object.values(photos[position]).filter(Boolean).length;
                const firstPhoto = Object.values(photos[position]).find(Boolean);
                return (
                  <div
                    key={position}
                    className={cn(
                      "aspect-square rounded-lg border-2 overflow-hidden relative",
                      hoofPhotoCount > 0 ? "border-primary/50" : "border-border"
                    )}
                  >
                    {firstPhoto ? (
                      <img src={firstPhoto} alt={label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">{label}</span>
                      </div>
                    )}
                    {hoofPhotoCount > 0 && (
                      <Badge className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5">
                        {hoofPhotoCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate Collage */}
          {photoCount >= 4 && !collageUrl && (
            <Button
              className="w-full"
              variant="secondary"
              onClick={generateCollage}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle Collage...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Collage generieren
                </>
              )}
            </Button>
          )}

          {/* Collage Preview */}
          {collageUrl && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">Fertige Collage</p>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={collageUrl} alt="Huf-Collage" className="w-full" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={downloadCollage}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button className="flex-1" onClick={shareCollage}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Teilen
                </Button>
              </div>
            </div>
          )}

          {/* Reset */}
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

      {/* Wizard Modal */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {horseName}
              </span>
              <Badge variant="outline">{currentStep}/{totalSteps}</Badge>
            </DialogTitle>
            <Progress value={progress} className="h-2 mt-2" />
          </DialogHeader>

          {/* Hoof Navigation Pills */}
          <div className="flex justify-center gap-2 p-3 bg-muted/50">
            {HOOF_POSITIONS.map((hoof, index) => {
              const hoofPhotoCount = Object.values(photos[hoof.position]).filter(Boolean).length;
              const isActive = index === currentHoofIndex;
              return (
                <Button
                  key={hoof.position}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => skipToHoof(index)}
                  className={cn(
                    "relative",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {hoof.label}
                  {hoofPhotoCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] flex items-center justify-center text-accent-foreground">
                      {hoofPhotoCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Current Step Info */}
          <div className="p-4 text-center">
            <h3 className="text-xl font-bold text-foreground">
              {currentHoof.fullLabel}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
              <currentAngle.icon className="h-4 w-4" />
              <span>{currentAngle.label}</span>
              <span className="text-xs">({currentAngle.description})</span>
            </div>
          </div>

          {/* Photo Area */}
          <div className="px-4 pb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />

            <div
              className={cn(
                "relative aspect-square rounded-xl border-2 border-dashed overflow-hidden",
                "flex items-center justify-center cursor-pointer transition-all",
                currentPhoto
                  ? "border-primary/50 bg-card"
                  : "border-border bg-muted/30 hover:border-primary hover:bg-primary/5"
              )}
              onClick={() => !currentPhoto && fileInputRef.current?.click()}
            >
              {currentPhoto ? (
                <>
                  <img
                    src={currentPhoto}
                    alt={`${currentHoof.label} ${currentAngle.label}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Guide overlay */}
                  {showGuides && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Center crosshair */}
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/30" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/30" />
                      {/* Rule of thirds */}
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCurrentPhoto();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute top-3 left-3 bg-primary">
                    <Check className="h-3 w-3 mr-1" />
                    {currentHoof.label} - {currentAngle.label}
                  </Badge>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  {/* Guide Overlay for empty state */}
                  {showGuides && (
                    <div className="absolute inset-8 border-2 border-dashed border-primary/20 rounded-lg pointer-events-none">
                      {/* Hoof outline guide */}
                      <div className="absolute inset-4 border border-primary/10 rounded-full" />
                    </div>
                  )}
                  <Camera className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">
                      {currentHoof.label} - {currentAngle.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tippe zum Fotografieren
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Guide Toggle */}
            <div className="flex items-center justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuides(!showGuides)}
                className={cn(showGuides && "text-primary")}
              >
                <Target className="h-4 w-4 mr-2" />
                Hilfslinien {showGuides ? "an" : "aus"}
              </Button>
            </div>

            {/* Angle Selection Pills */}
            <div className="flex justify-center gap-1 mt-4">
              {PHOTO_ANGLES.map((angle, index) => {
                const hasPhoto = !!photos[currentHoof.position][angle.id];
                const isActive = index === currentAngleIndex;
                return (
                  <Button
                    key={angle.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "relative px-3",
                      hasPhoto && !isActive && "text-accent"
                    )}
                    onClick={() => setCurrentAngleIndex(index)}
                  >
                    <angle.icon className="h-3 w-3 mr-1" />
                    {angle.label}
                    {hasPhoto && (
                      <Check className="h-3 w-3 ml-1 text-accent" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex justify-between items-center p-4 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentHoofIndex === 0 && currentAngleIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>

            {currentStep === totalSteps ? (
              <Button
                onClick={generateCollage}
                disabled={photoCount < 4 || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Collage erstellen
              </Button>
            ) : (
              <Button onClick={goNext}>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
