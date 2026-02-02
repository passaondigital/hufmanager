import { useState, useRef, useCallback, useEffect } from "react";
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
  Upload,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Hoof positions
const HOOF_POSITIONS = [
  { position: "VL", label: "VL", fullLabel: "Vorne Links" },
  { position: "VR", label: "VR", fullLabel: "Vorne Rechts" },
  { position: "HL", label: "HL", fullLabel: "Hinten Links" },
  { position: "HR", label: "HR", fullLabel: "Hinten Rechts" },
] as const;

// Photo angles per hoof
const PHOTO_ANGLES = [
  { id: "dorsal", label: "Dorsal" },
  { id: "lateral", label: "Lateral" },
  { id: "sole", label: "Sohle" },
  { id: "frog", label: "Strahl" },
  { id: "palmar", label: "Palmar" },
] as const;

type HoofPosition = typeof HOOF_POSITIONS[number]["position"];
type PhotoAngle = typeof PHOTO_ANGLES[number]["id"];

interface PhotoData {
  dataUrl: string;
  dbId?: string;
  url?: string;
}

interface HoofPhotos {
  [key: string]: {
    [angle: string]: PhotoData | null;
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
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0); // Track background uploads
  
  // Camera state - simplified
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentHoof = HOOF_POSITIONS[currentHoofIndex];
  const currentAngle = PHOTO_ANGLES[currentAngleIndex];
  const totalSteps = HOOF_POSITIONS.length * PHOTO_ANGLES.length;
  const currentStep = currentHoofIndex * PHOTO_ANGLES.length + currentAngleIndex + 1;
  const progress = (currentStep / totalSteps) * 100;

  // Count total photos taken
  const photoCount = Object.values(photos).reduce((count, hoofPhotos) => {
    return count + Object.values(hoofPhotos).filter(Boolean).length;
  }, 0);

  const currentPhoto = photos[currentHoof.position]?.[currentAngle.id];

  // Start camera - SIMPLE constraints, no frameRate!
  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      // Already have a stream
      setIsCameraReady(true);
      return;
    }
    
    try {
      setCameraError(null);
      setIsCameraReady(false);
      
      // SIMPLE constraints - NO frameRate to prevent flickering
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => setIsCameraReady(true))
            .catch((e) => {
              console.error("Play error:", e);
              setCameraError("Kamera konnte nicht gestartet werden");
            });
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Kamera nicht verfügbar - nutze Upload");
      setIsCameraActive(false);
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
    setIsCameraReady(false);
  }, []);

  // Camera lifecycle
  useEffect(() => {
    if (isWizardOpen && isCameraActive && !currentPhoto) {
      startCamera();
    }
    return () => {
      if (!isWizardOpen) {
        stopCamera();
      }
    };
  }, [isWizardOpen, isCameraActive, currentPhoto, startCamera, stopCamera]);

  // SCHNELLFEUER-MODUS: Save locally FIRST, upload to cloud in BACKGROUND
  const savePhotoLocally = useCallback((
    dataUrl: string,
    position: HoofPosition,
    angle: PhotoAngle
  ) => {
    // INSTANT: Update local state immediately - no waiting!
    setPhotos((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        [angle]: { dataUrl },
      },
    }));
  }, []);

  // Background upload - fire and forget, doesn't block UI
  const uploadToCloudInBackground = useCallback((
    dataUrl: string,
    position: HoofPosition,
    angle: PhotoAngle
  ) => {
    setPendingUploads(prev => prev + 1);

    // Fire and forget - upload runs in background
    (async () => {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const timestamp = Date.now();
        const fileName = `${horseId}/${position}_${angle}_${timestamp}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("hoof_photos")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("hoof_photos")
            .getPublicUrl(fileName);

          await supabase.from("hoof_photos").insert({
            horse_id: horseId,
            hoof_position: `${position}_${angle}`,
            photo_url: fileName,
            url: publicUrl,
            file_path: fileName,
            taken_at: new Date().toISOString(),
          });

          // Update local state with cloud URL
          setPhotos((prev) => ({
            ...prev,
            [position]: {
              ...prev[position],
              [angle]: { ...prev[position]?.[angle], url: publicUrl },
            },
          }));
        }
      } catch (err) {
        console.error("Background upload failed:", err);
      } finally {
        setPendingUploads(prev => Math.max(0, prev - 1));
      }
    })();
  }, [horseId]);

  // Auto-advance to next position
  const advanceToNext = useCallback(() => {
    if (currentAngleIndex < PHOTO_ANGLES.length - 1) {
      setCurrentAngleIndex((prev) => prev + 1);
    } else if (currentHoofIndex < HOOF_POSITIONS.length - 1) {
      setCurrentHoofIndex((prev) => prev + 1);
      setCurrentAngleIndex(0);
      toast.info(`Weiter zu: ${HOOF_POSITIONS[currentHoofIndex + 1].fullLabel}`);
    } else {
      // All done!
      toast.success("Alle 20 Fotos aufgenommen!");
    }
  }, [currentAngleIndex, currentHoofIndex]);

  // Capture photo from camera - SCHNELLFEUER-MODUS!
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture current position before any state changes
    const capturePosition = currentHoof.position;
    const captureAngle = currentAngle.id;
    const captureHoofLabel = currentHoof.label;
    const captureAngleLabel = currentAngle.label;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Burn-in metadata
    const padding = 20;
    const fontSize = Math.max(16, Math.floor(canvas.width / 50));

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height - fontSize * 2.5, canvas.width, fontSize * 2.5);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "left";

    const dateStr = new Date().toLocaleDateString("de-DE");
    const timeStr = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const metaText = `${horseName} | ${captureHoofLabel}-${captureAngleLabel} | ${dateStr} ${timeStr}`;

    ctx.fillText(metaText, padding, canvas.height - fontSize * 0.8);

    ctx.fillStyle = "#F47B20";
    ctx.textAlign = "right";
    ctx.fillText("HufManager", canvas.width - padding, canvas.height - fontSize * 0.8);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // INSTANT: Save locally first (no waiting!)
    savePhotoLocally(dataUrl, capturePosition, captureAngle);

    // Upload in background (fire and forget)
    uploadToCloudInBackground(dataUrl, capturePosition, captureAngle);

    // AUTO-ADVANCE immediately to next position!
    advanceToNext();
  }, [isCameraReady, horseName, currentHoof, currentAngle, savePhotoLocally, uploadToCloudInBackground, advanceToNext]);

  // Handle file upload from gallery
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      // Upload to DB - NO auto-advance, user clicks "Weiter"
      await uploadAndSavePhoto(dataUrl, currentHoof.position, currentAngle.id);
    };
    reader.onerror = () => {
      toast.error("Fehler beim Laden des Bildes");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [currentHoof.position, currentAngle.id, uploadAndSavePhoto, advanceToNext]);

  // Navigation
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

  // Remove current photo
  const removeCurrentPhoto = useCallback(async () => {
    const photo = photos[currentHoof.position]?.[currentAngle.id];
    if (!photo) return;
    
    // Remove from DB if saved
    if (photo.dbId) {
      await supabase.from("hoof_photos").delete().eq("id", photo.dbId);
    }
    
    setPhotos((prev) => ({
      ...prev,
      [currentHoof.position]: {
        ...prev[currentHoof.position],
        [currentAngle.id]: null,
      },
    }));
    
    toast.info("Foto entfernt");
  }, [photos, currentHoof.position, currentAngle.id]);

  // Generate collage
  const generateCollage = useCallback(async () => {
    if (photoCount < 1) {
      toast.error("Mindestens 1 Foto erforderlich");
      return;
    }

    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

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

      // Header
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(`🐴 ${horseName}`, padding + 10, 48);

      const now = new Date();
      const dateStr = now.toLocaleDateString("de-DE");
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#888888";
      ctx.textAlign = "right";
      ctx.fillText(dateStr, collageSize - padding - 10, 48);

      // Collect all photos
      const allPhotos: { position: string; angle: string; dataUrl: string }[] = [];
      Object.entries(photos).forEach(([position, angles]) => {
        Object.entries(angles).forEach(([angle, photoData]) => {
          if (photoData?.dataUrl) {
            allPhotos.push({ position, angle, dataUrl: photoData.dataUrl });
          }
        });
      });

      // Grid layout
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

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, photoWidth, photoHeight, 10);
          ctx.clip();

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
          ctx.fillStyle = "rgba(244, 123, 32, 0.95)";
          const labelWidth = 44;
          const labelHeight = 28;
          ctx.beginPath();
          ctx.roundRect(x + 8, y + 8, labelWidth, labelHeight, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(photo.position, x + 8 + labelWidth / 2, y + 8 + labelHeight / 2 + 5);

          // Angle label
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "right";
          const angleLabel = PHOTO_ANGLES.find(a => a.id === photo.angle)?.label || photo.angle;
          ctx.fillText(angleLabel, x + photoWidth - 8, y + photoHeight - 8);
        } catch (err) {
          console.error("Error loading image:", err);
        }
      }

      // Footer
      ctx.fillStyle = "#444444";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      ctx.fillText(`📅 ${dateStr} • ${time}`, padding + 10, collageSize - 18);

      ctx.textAlign = "right";
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("HufManager.de", collageSize - padding - 10, collageSize - 18);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCollageUrl(dataUrl);
      onCollageGenerated?.(dataUrl);
      onPhotosComplete?.(photos);
      setIsWizardOpen(false);
      toast.success("Collage erstellt!");
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
        });
      } else {
        downloadCollage();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
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

  const closeWizard = () => {
    stopCamera();
    setIsWizardOpen(false);
    setIsCameraActive(false);
  };

  const openWizard = () => {
    setIsWizardOpen(true);
    setIsCameraActive(true);
  };

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
            onClick={openWizard}
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
                    {firstPhoto?.dataUrl ? (
                      <img src={firstPhoto.dataUrl} alt={label} className="w-full h-full object-cover" />
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
          {photoCount >= 1 && !collageUrl && (
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
                  Collage generieren ({photoCount} Fotos)
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
      <Dialog open={isWizardOpen} onOpenChange={closeWizard}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[95vh] flex flex-col">
          <DialogHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {horseName}
              </span>
              <Badge variant="outline">{photoCount}/{totalSteps}</Badge>
            </DialogTitle>
            <Progress value={progress} className="h-2 mt-2" />
          </DialogHeader>

          {/* Hoof Navigation Pills */}
          <div className="flex justify-center gap-2 p-3 bg-muted/50 flex-shrink-0">
            {HOOF_POSITIONS.map((hoof, index) => {
              const hoofPhotoCount = Object.values(photos[hoof.position]).filter(Boolean).length;
              const isActive = index === currentHoofIndex;
              const isComplete = hoofPhotoCount === PHOTO_ANGLES.length;
              return (
                <Button
                  key={hoof.position}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => skipToHoof(index)}
                  className={cn(
                    "relative",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    isComplete && !isActive && "bg-green-500/10 border-green-500/50"
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
          <div className="p-4 text-center flex-shrink-0">
            <h3 className="text-xl font-bold text-foreground">
              {currentHoof.fullLabel}
            </h3>
            <p className="text-muted-foreground mt-1">
              {currentAngle.label} ({currentStep}/{totalSteps})
            </p>
          </div>

          {/* Photo/Camera Area */}
          <div className="px-4 pb-4 flex-1 overflow-hidden">
            {/* Hidden file input - NO capture attribute to allow gallery selection */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <canvas ref={canvasRef} className="hidden" />

            <div
              className={cn(
                "relative aspect-square rounded-xl border-2 overflow-hidden",
                "flex items-center justify-center transition-all",
                currentPhoto ? "border-primary/50 bg-card" : "border-border bg-black"
              )}
            >
              {/* Loading overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                    <p>Wird hochgeladen...</p>
                  </div>
                </div>
              )}

              {currentPhoto?.dataUrl ? (
                /* Photo Preview with Action Buttons */
                <>
                  <img
                    src={currentPhoto.dataUrl}
                    alt={`${currentHoof.label} ${currentAngle.label}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3"
                    onClick={removeCurrentPhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute top-3 left-3 bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    {photoCount}/{totalSteps}
                  </Badge>

                  {/* Action Buttons overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-3">
                      {photoCount >= totalSteps ? (
                        /* All 20 photos done - show Collage button */
                        <Button
                          size="lg"
                          className="h-14 px-8 bg-green-500 hover:bg-green-600 text-white gap-2"
                          onClick={generateCollage}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Sparkles className="h-5 w-5" />
                          )}
                          Jetzt Collage erstellen!
                        </Button>
                      ) : currentStep === totalSteps ? (
                        /* Last photo position - show Collage option */
                        <Button
                          size="lg"
                          className="h-14 px-6 bg-primary text-white gap-2"
                          onClick={generateCollage}
                          disabled={isGenerating || photoCount < 1}
                        >
                          <Sparkles className="h-5 w-5" />
                          Collage ({photoCount})
                        </Button>
                      ) : (
                        /* Not last photo - show Weiter button */
                        <Button
                          size="lg"
                          className="h-14 px-8 bg-primary text-white gap-2"
                          onClick={advanceToNext}
                        >
                          Weiter
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : isCameraActive && !cameraError ? (
                /* Live Camera View */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Camera Loading */}
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  )}

                  {/* Camera Controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-4">
                      {/* Upload from Gallery */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white h-12 w-12"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <ImageIcon className="h-6 w-6" />
                      </Button>

                      {/* Capture Button */}
                      <Button
                        size="lg"
                        className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
                        onClick={capturePhoto}
                        disabled={!isCameraReady || isUploading}
                      >
                        <Camera className="h-8 w-8" />
                      </Button>

                      {/* Placeholder for symmetry */}
                      <div className="w-12" />
                    </div>
                  </div>
                </>
              ) : (
                /* Upload Mode / Camera Error */
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
                  <div className="text-center mb-2">
                    <p className="font-bold text-lg text-foreground">
                      {currentHoof.label} - {currentAngle.label}
                    </p>
                    {cameraError && (
                      <p className="text-sm text-amber-500 mt-1">
                        {cameraError}
                      </p>
                    )}
                  </div>

                  {/* Upload from Gallery - Primary Button */}
                  <Button
                    size="lg"
                    className="h-16 px-8 gap-3 bg-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6" />
                        Foto aus Galerie wählen
                      </>
                    )}
                  </Button>

                  {/* Retry Camera Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCameraError(null);
                      setIsCameraActive(true);
                      startCamera();
                    }}
                    disabled={isUploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Kamera erneut versuchen
                  </Button>
                </div>
              )}
            </div>

            {/* Angle Selection Pills */}
            <div className="flex justify-center gap-1 mt-4 flex-wrap">
              {PHOTO_ANGLES.map((angle, index) => {
                const hasPhoto = !!photos[currentHoof.position]?.[angle.id];
                const isActive = index === currentAngleIndex;
                return (
                  <Button
                    key={angle.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "relative px-3",
                      hasPhoto && !isActive && "text-green-500"
                    )}
                    onClick={() => setCurrentAngleIndex(index)}
                  >
                    {angle.label}
                    {hasPhoto && (
                      <Check className="h-3 w-3 ml-1 text-green-500" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex justify-between items-center p-4 border-t border-border bg-muted/30 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentHoofIndex === 0 && currentAngleIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>

            {photoCount >= 1 ? (
              <Button
                onClick={generateCollage}
                disabled={photoCount < 1 || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Collage ({photoCount})
              </Button>
            ) : (
              <Button onClick={goNext} disabled={currentStep === totalSteps}>
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
