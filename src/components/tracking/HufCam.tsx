import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  ImagePlus,
  RotateCcw,
  Loader2,
  X,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HoofPosition = "VL" | "VR" | "HL" | "HR";

interface HufCamProps {
  horseName: string;
  horseId: string;
  onCollageGenerated?: (collageDataUrl: string) => void;
}

const HOOF_POSITIONS: { position: HoofPosition; label: string; fullLabel: string }[] = [
  { position: "VL", label: "VL", fullLabel: "Vorne Links" },
  { position: "VR", label: "VR", fullLabel: "Vorne Rechts" },
  { position: "HL", label: "HL", fullLabel: "Hinten Links" },
  { position: "HR", label: "HR", fullLabel: "Hinten Rechts" },
];

export function HufCam({ horseName, horseId, onCollageGenerated }: HufCamProps) {
  // Photos state - simple Record for the 4 hoofs
  const [photos, setPhotos] = useState<Record<HoofPosition, string | null>>({
    VL: null,
    VR: null,
    HL: null,
    HR: null,
  });
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [selectedHoof, setSelectedHoof] = useState<HoofPosition>("VL");
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start camera - SIMPLE constraints, no frameRate forcing
  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // Already running
    
    setIsCameraLoading(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // NO frameRate constraint - let browser decide to avoid flickering
        },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
        await videoRef.current.play();
      }
      
      setIsCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Kamera konnte nicht gestartet werden", {
        description: "Bitte Berechtigungen prüfen oder Galerie-Upload nutzen.",
      });
    } finally {
      setIsCameraLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      toast.error("Kamera nicht bereit");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Get data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    
    // Save to selected hoof slot
    setPhotos(prev => ({ ...prev, [selectedHoof]: dataUrl }));
    
    toast.success(`${selectedHoof} Foto aufgenommen!`);
    
    // Auto-advance to next empty slot
    const positions: HoofPosition[] = ["VL", "VR", "HL", "HR"];
    const currentIndex = positions.indexOf(selectedHoof);
    for (let i = 1; i <= 4; i++) {
      const nextIndex = (currentIndex + i) % 4;
      const nextPosition = positions[nextIndex];
      if (!photos[nextPosition]) {
        setSelectedHoof(nextPosition);
        break;
      }
    }
  }, [isCameraActive, selectedHoof, photos]);

  // Handle file upload (gallery fallback)
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotos(prev => ({ ...prev, [selectedHoof]: dataUrl }));
      toast.success(`${selectedHoof} Foto hochgeladen!`);
      
      // Auto-advance to next empty slot
      const positions: HoofPosition[] = ["VL", "VR", "HL", "HR"];
      const currentIndex = positions.indexOf(selectedHoof);
      for (let i = 1; i <= 4; i++) {
        const nextIndex = (currentIndex + i) % 4;
        const nextPosition = positions[nextIndex];
        if (!photos[nextPosition]) {
          setSelectedHoof(nextPosition);
          break;
        }
      }
    };
    reader.onerror = () => toast.error("Fehler beim Laden des Bildes");
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [selectedHoof, photos]);

  // Trigger file input click
  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove photo from slot
  const removePhoto = useCallback((position: HoofPosition) => {
    setPhotos(prev => ({ ...prev, [position]: null }));
    setSelectedHoof(position);
  }, []);

  // Select hoof slot
  const selectHoof = useCallback((position: HoofPosition) => {
    setSelectedHoof(position);
    // If camera not active, start it
    if (!isCameraActive && !isCameraLoading) {
      startCamera();
    }
  }, [isCameraActive, isCameraLoading, startCamera]);

  // Generate collage
  const generateCollage = useCallback(async () => {
    const filledPhotos = Object.values(photos).filter(Boolean);
    if (filledPhotos.length < 2) {
      toast.error("Mindestens 2 Fotos benötigt");
      return;
    }

    setIsGeneratingCollage(true);
    toast.info("Collage wird generiert...");

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // 1080x1080 Instagram square
      const size = 1080;
      const padding = 20;
      const headerHeight = 80;
      const footerHeight = 60;
      
      canvas.width = size;
      canvas.height = size;

      // Dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(1, "#0d0d0d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Header with horse name
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(horseName, size / 2, 50);

      // Load images and draw in 2x2 grid
      const positions: HoofPosition[] = ["VL", "VR", "HL", "HR"];
      const gridSize = (size - padding * 3) / 2;
      const photoAreaTop = headerHeight;

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const photoData = photos[pos];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = padding + col * (gridSize + padding);
        const y = photoAreaTop + padding + row * (gridSize + padding);

        // Draw slot background
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, y, gridSize, gridSize);

        if (photoData) {
          // Load and draw image
          const img = await loadImage(photoData);
          
          // Calculate crop to fill (cover)
          const imgAspect = img.width / img.height;
          const boxAspect = 1; // Square
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          
          if (imgAspect > boxAspect) {
            sw = img.height;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, x, y, gridSize, gridSize);
        }

        // Position label
        ctx.fillStyle = "rgba(244, 123, 32, 0.9)";
        ctx.fillRect(x + 10, y + 10, 50, 30);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pos, x + 35, y + 30);
      }

      // Footer with timestamp
      const now = new Date();
      const timestamp = now.toLocaleDateString("de-DE") + " • " + 
                        now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      
      ctx.fillStyle = "#666666";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`📅 ${timestamp}`, padding, size - 25);

      ctx.textAlign = "right";
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("HufManager.de", size - padding, size - 25);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCollageGenerated?.(dataUrl);
      
      toast.success("Collage erstellt!", {
        description: "Bereit zum Teilen",
      });
    } catch (error) {
      console.error("Collage error:", error);
      toast.error("Fehler beim Erstellen der Collage");
    } finally {
      setIsGeneratingCollage(false);
    }
  }, [photos, horseName, onCollageGenerated]);

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Reset all
  const resetAll = useCallback(() => {
    setPhotos({ VL: null, VR: null, HL: null, HR: null });
    setSelectedHoof("VL");
    stopCamera();
  }, [stopCamera]);

  const photoCount = Object.values(photos).filter(Boolean).length;
  const canGenerateCollage = photoCount >= 2;

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
        {/* Hidden file input for gallery upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera View */}
        <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              "w-full h-full object-cover",
              !isCameraActive && "hidden"
            )}
          />
          
          {/* Placeholder when camera inactive */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
              {isCameraLoading ? (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              ) : (
                <>
                  <VideoOff className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Kamera inaktiv</p>
                </>
              )}
            </div>
          )}
          
          {/* Selected hoof indicator */}
          {isCameraActive && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              Aufnahme für: {selectedHoof}
            </Badge>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex gap-2">
          {!isCameraActive ? (
            <Button
              onClick={startCamera}
              disabled={isCameraLoading}
              className="flex-1 h-12"
            >
              {isCameraLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Video className="h-5 w-5 mr-2" />
              )}
              Kamera starten
            </Button>
          ) : (
            <>
              <Button
                onClick={capturePhoto}
                className="flex-1 h-12 bg-primary hover:bg-primary/90"
              >
                <Camera className="h-5 w-5 mr-2" />
                Foto aufnehmen
              </Button>
              <Button
                variant="outline"
                onClick={stopCamera}
                className="h-12"
              >
                <VideoOff className="h-5 w-5" />
              </Button>
            </>
          )}
          
          {/* Gallery Upload Button - ALWAYS visible */}
          <Button
            variant="outline"
            onClick={triggerFileUpload}
            className="h-12"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
        </div>

        {/* Hoof Grid - ALWAYS visible */}
        <div className="grid grid-cols-2 gap-3">
          {HOOF_POSITIONS.map(({ position, label, fullLabel }) => (
            <div
              key={position}
              onClick={() => !photos[position] && selectHoof(position)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                selectedHoof === position && !photos[position]
                  ? "border-primary ring-2 ring-primary/30"
                  : photos[position]
                  ? "border-green-500/50"
                  : "border-dashed border-border hover:border-primary/50"
              )}
            >
              {photos[position] ? (
                <>
                  <img
                    src={photos[position]!}
                    alt={fullLabel}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                    {label}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(position);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-muted/30">
                  <Camera className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground/70">{fullLabel}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Collage Button */}
        <Button
          onClick={generateCollage}
          disabled={!canGenerateCollage || isGeneratingCollage}
          className="w-full h-12"
        >
          {isGeneratingCollage ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Collage wird erstellt...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Collage erstellen ({photoCount}/4)
            </>
          )}
        </Button>

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
