import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Zap,
  FolderOpen,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Check,
  X,
  Download,
  Share2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

const HOOVES = [
  { id: "VL", label: "Vorne Links", short: "VL" },
  { id: "VR", label: "Vorne Rechts", short: "VR" },
  { id: "HL", label: "Hinten Links", short: "HL" },
  { id: "HR", label: "Hinten Rechts", short: "HR" },
] as const;

const PERSPECTIVES = [
  { id: "dorsal", label: "Dorsal", desc: "Vorderansicht" },
  { id: "lateral", label: "Lateral", desc: "Außenseite" },
  { id: "medial", label: "Medial", desc: "Innenseite" },
  { id: "solar", label: "Solar", desc: "Sohle" },
  { id: "palmar", label: "Palmar", desc: "Rückseite" },
] as const;

type HoofId = typeof HOOVES[number]["id"];
type PerspectiveId = typeof PERSPECTIVES[number]["id"];
type CaptureMode = "ai" | "live" | "gallery";

interface PhotoData {
  dataUrl: string;
  perspective: PerspectiveId;
  timestamp: number;
}

interface HoofData {
  photos: Map<PerspectiveId, PhotoData>;
  collageUrl?: string;
}

interface HufCamProProps {
  horseId: string;
  horseName: string;
  eqid?: string;
  pid?: string;
  onComplete?: () => void;
  onCollageGenerated?: (collageUrl: string) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function HufCamPro({
  horseId,
  horseName,
  eqid,
  pid,
  onComplete,
}: HufCamProProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [currentHoofIndex, setCurrentHoofIndex] = useState(0);
  const [currentPerspectiveIndex, setCurrentPerspectiveIndex] = useState(0);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("live");
  const [hoofData, setHoofData] = useState<Map<HoofId, HoofData>>(new Map());
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showIdOnCollage, setShowIdOnCollage] = useState(false);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completedCollages, setCompletedCollages] = useState<Array<{
    hoofId: HoofId;
    collageUrl: string;
    timestamp: number;
  }>>([]);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Device orientation for AI mode
  const { isLevel, tiltAngle, requestPermission } = useDeviceOrientation();

  // Computed values
  const currentHoof = HOOVES[currentHoofIndex];
  const currentPerspective = PERSPECTIVES[currentPerspectiveIndex];
  const currentHoofData = hoofData.get(currentHoof.id);
  const currentPhoto = currentHoofData?.photos.get(currentPerspective.id);
  const photosForCurrentHoof = currentHoofData?.photos.size || 0;
  const totalPhotos = Array.from(hoofData.values()).reduce(
    (sum, hd) => sum + hd.photos.size,
    0
  );

  // ---------------------------------------------------------------------------
  // CAMERA FUNCTIONS
  // ---------------------------------------------------------------------------

  const startCamera = useCallback(async () => {
    try {
      // Simple constraints - no frameRate to prevent flickering
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      setTorchSupported(!!capabilities?.torch);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => setIsCameraReady(true))
            .catch(console.error);
        };
      }

      setIsCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Kamera nicht verfügbar - nutze Galerie");
      setCaptureMode("gallery");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return;

    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error("Torch error:", err);
    }
  }, [torchOn, torchSupported]);

  // ---------------------------------------------------------------------------
  // CAPTURE FUNCTIONS
  // ---------------------------------------------------------------------------

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);
  }, [isCameraReady]);

  const handleGalleryUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Bitte nur Bilder hochladen");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const confirmPhoto = useCallback(() => {
    if (!capturedPhoto) return;

    const photoData: PhotoData = {
      dataUrl: capturedPhoto,
      perspective: currentPerspective.id,
      timestamp: Date.now(),
    };

    setHoofData((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(currentHoof.id) || { photos: new Map() };
      existing.photos.set(currentPerspective.id, photoData);
      newMap.set(currentHoof.id, existing);
      return newMap;
    });

    setCapturedPhoto(null);

    // Auto-advance to next perspective
    if (currentPerspectiveIndex < PERSPECTIVES.length - 1) {
      setCurrentPerspectiveIndex((i) => i + 1);
    } else {
      toast.success(`${currentHoof.label} komplett!`);
    }
  }, [capturedPhoto, currentHoof, currentPerspective, currentPerspectiveIndex]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const removePhoto = useCallback(
    (perspectiveId: PerspectiveId) => {
      setHoofData((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(currentHoof.id);
        if (existing) {
          existing.photos.delete(perspectiveId);
          newMap.set(currentHoof.id, existing);
        }
        return newMap;
      });
    },
    [currentHoof]
  );

  // ---------------------------------------------------------------------------
  // COLLAGE GENERATION
  // ---------------------------------------------------------------------------

  const generateCollage = useCallback(
    async (hoofId: HoofId): Promise<string | null> => {
      const hData = hoofData.get(hoofId);
      if (!hData || hData.photos.size === 0) return null;

      setIsGeneratingCollage(true);

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        const hoofInfo = HOOVES.find((h) => h.id === hoofId);
        const photos = Array.from(hData.photos.values());

        // Canvas size
        const width = 1080;
        const headerHeight = 80;
        const footerHeight = 60;
        const padding = 12;

        // Calculate grid
        const cols = Math.min(photos.length, 3);
        const rows = Math.ceil(photos.length / cols);
        const photoWidth = (width - padding * (cols + 1)) / cols;
        const photoHeight = photoWidth * 0.75;
        const height = headerHeight + rows * (photoHeight + padding) + footerHeight;

        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);

        // Orange accent line
        ctx.fillStyle = "#F47B20";
        ctx.fillRect(0, 0, width, 4);

        // Header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${hoofInfo?.label} (${hoofInfo?.short})`, padding + 8, 52);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#888888";
        ctx.textAlign = "right";
        ctx.fillText(horseName, width - padding - 8, 52);

        // Load and draw photos
        const loadImage = (src: string): Promise<HTMLImageElement> =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = padding + col * (photoWidth + padding);
          const y = headerHeight + padding + row * (photoHeight + padding);

          try {
            const img = await loadImage(photo.dataUrl);

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, photoWidth, photoHeight, 8);
            ctx.clip();

            // Cover fit
            const imgAspect = img.width / img.height;
            const boxAspect = photoWidth / photoHeight;
            let sx = 0,
              sy = 0,
              sw = img.width,
              sh = img.height;
            if (imgAspect > boxAspect) {
              sw = img.height * boxAspect;
              sx = (img.width - sw) / 2;
            } else {
              sh = img.width / boxAspect;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
            ctx.restore();

            // Perspective label
            const perspInfo = PERSPECTIVES.find((p) => p.id === photo.perspective);
            ctx.fillStyle = "rgba(244, 123, 32, 0.9)";
            ctx.beginPath();
            ctx.roundRect(x + 6, y + 6, 70, 24, 4);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(perspInfo?.label || "", x + 6 + 35, y + 6 + 17);
          } catch (err) {
            console.error("Error loading image:", err);
          }
        }

        // Footer
        const now = new Date();
        const dateStr = now.toLocaleDateString("de-DE");

        // Watermark (center)
        ctx.fillStyle = "#F47B20";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("HUFCAMPRO - HM", width / 2, height - 22);

        // Date (right) with outline
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "right";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(dateStr, width - padding - 8, height - 22);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(dateStr, width - padding - 8, height - 22);

        // ID (left) - optional
        if (showIdOnCollage && (eqid || pid)) {
          const idText = `#${eqid || ""}${eqid && pid ? " / " : ""}#${pid || ""}`;
          ctx.textAlign = "left";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText(idText, padding + 8, height - 22);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(idText, padding + 8, height - 22);
        }

        const collageUrl = canvas.toDataURL("image/jpeg", 0.92);
        return collageUrl;
      } catch (error) {
        console.error("Collage generation error:", error);
        toast.error("Fehler beim Erstellen der Collage");
        return null;
      } finally {
        setIsGeneratingCollage(false);
      }
    },
    [hoofData, horseName, showIdOnCollage, eqid, pid]
  );

  const generateAndSaveCollage = useCallback(async () => {
    const collageUrl = await generateCollage(currentHoof.id);
    if (!collageUrl) return;

    // Update local state
    setHoofData((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(currentHoof.id);
      if (existing) {
        existing.collageUrl = collageUrl;
        newMap.set(currentHoof.id, existing);
      }
      return newMap;
    });

    setCompletedCollages((prev) => [
      ...prev,
      { hoofId: currentHoof.id, collageUrl, timestamp: Date.now() },
    ]);

    toast.success("Collage erstellt!");
  }, [currentHoof, generateCollage]);

  // ---------------------------------------------------------------------------
  // SUPABASE UPLOAD
  // ---------------------------------------------------------------------------

  const saveToSupabase = useCallback(async () => {
    setIsSaving(true);
    let successCount = 0;

    try {
      for (const [hoofId, hData] of hoofData.entries()) {
        // Upload individual photos
        for (const [perspId, photo] of hData.photos.entries()) {
          const response = await fetch(photo.dataUrl);
          const blob = await response.blob();
          const fileName = `${horseId}/${hoofId}_${perspId}_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("hoof_photos")
            .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("hoof_photos").getPublicUrl(fileName);

            await supabase.from("hoof_photos").insert({
              horse_id: horseId,
              hoof_position: `${hoofId}_${perspId}`,
              photo_url: fileName,
              url: publicUrl,
              taken_at: new Date(photo.timestamp).toISOString(),
            });
            successCount++;
          }
        }

        // Upload collage
        if (hData.collageUrl) {
          const response = await fetch(hData.collageUrl);
          const blob = await response.blob();
          const fileName = `${horseId}/${hoofId}_collage_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("hoof_photos")
            .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("hoof_photos").getPublicUrl(fileName);

            await supabase.from("hoof_photos").insert({
              horse_id: horseId,
              hoof_position: hoofId,
              photo_url: fileName,
              url: publicUrl,
              notes: "collage",
              taken_at: new Date().toISOString(),
            });
          }
        }
      }

      toast.success(`${successCount} Fotos gespeichert!`);
      onComplete?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  }, [hoofData, horseId, onComplete]);

  // ---------------------------------------------------------------------------
  // EXPORT FUNCTIONS
  // ---------------------------------------------------------------------------

  const downloadCollage = useCallback((collageUrl: string, hoofId: HoofId) => {
    const link = document.createElement("a");
    link.download = `${horseName}_${hoofId}_${new Date().toISOString().split("T")[0]}.jpg`;
    link.href = collageUrl;
    link.click();
  }, [horseName]);

  const downloadAllAsZip = useCallback(async () => {
    // For simplicity, download individually (ZIP would require a library)
    for (const collage of completedCollages) {
      downloadCollage(collage.collageUrl, collage.hoofId);
      await new Promise((r) => setTimeout(r, 500)); // Stagger downloads
    }
  }, [completedCollages, downloadCollage]);

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen && captureMode !== "gallery" && !capturedPhoto) {
      startCamera();
      if (captureMode === "ai") requestPermission();
    }
    return () => {
      if (!isOpen) stopCamera();
    };
  }, [isOpen, captureMode, capturedPhoto, startCamera, stopCamera, requestPermission]);

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------

  const goToHoof = (index: number) => {
    setCurrentHoofIndex(index);
    setCurrentPerspectiveIndex(0);
    setCapturedPhoto(null);
  };

  const goToPerspective = (index: number) => {
    setCurrentPerspectiveIndex(index);
    setCapturedPhoto(null);
  };

  const closeWizard = () => {
    stopCamera();
    setIsOpen(false);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Trigger Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">HufCam Pro</h3>
                <p className="text-sm text-muted-foreground">
                  {totalPhotos > 0 ? `${totalPhotos} Fotos` : "Huf-Dokumentation starten"}
                </p>
              </div>
            </div>
            {completedCollages.length > 0 && (
              <Badge className="bg-green-500">{completedCollages.length} Collagen</Badge>
            )}
          </div>

          <Button className="w-full h-12 text-lg gap-2" onClick={() => setIsOpen(true)}>
            <Camera className="h-5 w-5" />
            {totalPhotos > 0 ? "Fortsetzen" : "Dokumentation starten"}
          </Button>

          {/* Collage Preview */}
          {completedCollages.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">Fertige Collagen</p>
              <div className="grid grid-cols-2 gap-2">
                {completedCollages.map((c) => (
                  <div
                    key={c.timestamp}
                    className="relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => downloadCollage(c.collageUrl, c.hoofId)}
                  >
                    <img src={c.collageUrl} alt={c.hoofId} className="w-full" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="absolute top-1 left-1 text-xs">{c.hoofId}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={downloadAllAsZip}>
                  <Download className="h-4 w-4 mr-1" />
                  Alle herunterladen
                </Button>
                <Button size="sm" className="flex-1" onClick={saveToSupabase} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={closeWizard}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[95vh] flex flex-col bg-background">
          {/* Header */}
          <DialogHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {horseName}
              </span>
              <Badge variant="outline">
                {photosForCurrentHoof}/{PERSPECTIVES.length} Fotos
              </Badge>
            </DialogTitle>

            {/* Hoof Navigation */}
            <div className="flex gap-2 pt-2">
              {HOOVES.map((hoof, i) => {
                const hData = hoofData.get(hoof.id);
                const count = hData?.photos.size || 0;
                const hasCollage = !!hData?.collageUrl;
                return (
                  <Button
                    key={hoof.id}
                    variant={i === currentHoofIndex ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1 relative",
                      hasCollage && "border-green-500 bg-green-500/10"
                    )}
                    onClick={() => goToHoof(i)}
                  >
                    {hoof.short}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-white">
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </DialogHeader>

          {/* Mode Selector */}
          <div className="flex justify-center gap-1 p-2 bg-muted/50 flex-shrink-0">
            <Button
              variant={captureMode === "ai" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCaptureMode("ai")}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              AI Cam
            </Button>
            <Button
              variant={captureMode === "live" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCaptureMode("live")}
              className="gap-1"
            >
              <Zap className="h-4 w-4" />
              Live Cam
            </Button>
            <Button
              variant={captureMode === "gallery" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCaptureMode("gallery")}
              className="gap-1"
            >
              <FolderOpen className="h-4 w-4" />
              Galerie
            </Button>
          </div>

          {/* Current Perspective Info */}
          <div className="p-3 text-center flex-shrink-0 bg-black/20">
            <h3 className="text-lg font-bold">{currentHoof.label}</h3>
            <p className="text-primary font-medium">
              {currentPerspective.label} - {currentPerspective.desc}
            </p>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 overflow-auto">
            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera / Preview Area */}
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
              {capturedPhoto ? (
                /* Photo Preview */
                <>
                  <img
                    src={capturedPhoto}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="h-14 w-14 rounded-full"
                      onClick={retakePhoto}
                    >
                      <RotateCcw className="h-6 w-6" />
                    </Button>
                    <Button
                      size="lg"
                      className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                      onClick={confirmPhoto}
                    >
                      <Check className="h-6 w-6" />
                    </Button>
                  </div>
                </>
              ) : captureMode === "gallery" ? (
                /* Gallery Mode */
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderOpen className="h-16 w-16 text-muted-foreground" />
                  <p className="font-medium">Foto aus Galerie wählen</p>
                </div>
              ) : (
                /* Camera Mode */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* AI Mode Overlay */}
                  {captureMode === "ai" && isCameraReady && (
                    <CameraGuideOverlay
                      view="dorsal"
                      isLevel={isLevel}
                      tiltAngle={tiltAngle}
                      requiresLevel={true}
                    />
                  )}

                  {/* Camera Loading */}
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  )}

                  {/* Camera Controls */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
                    {/* Torch */}
                    {torchSupported && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={toggleTorch}
                      >
                        {torchOn ? (
                          <Flashlight className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <FlashlightOff className="h-5 w-5" />
                        )}
                      </Button>
                    )}

                    {/* Capture */}
                    <Button
                      size="lg"
                      className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
                      onClick={captureFromCamera}
                      disabled={!isCameraReady}
                    >
                      <Camera className="h-8 w-8" />
                    </Button>

                    {/* Gallery fallback */}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </>
              )}

              {/* Current photo badge */}
              {currentPhoto && !capturedPhoto && (
                <Badge className="absolute top-3 left-3 bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Aufgenommen
                </Badge>
              )}
            </div>

            {/* Perspective Pills */}
            <div className="flex justify-center gap-1 mt-4 flex-wrap">
              {PERSPECTIVES.map((persp, i) => {
                const hasPhoto = currentHoofData?.photos.has(persp.id);
                return (
                  <Button
                    key={persp.id}
                    variant={i === currentPerspectiveIndex ? "default" : "ghost"}
                    size="sm"
                    className={cn("relative px-3", hasPhoto && "text-green-500")}
                    onClick={() => goToPerspective(i)}
                  >
                    {persp.label}
                    {hasPhoto && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                );
              })}
            </div>

            {/* Photo Thumbnails */}
            {photosForCurrentHoof > 0 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {Array.from(currentHoofData?.photos.entries() || []).map(
                  ([perspId, photo]) => (
                    <div key={perspId} className="relative flex-shrink-0">
                      <img
                        src={photo.dataUrl}
                        alt={perspId}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                        onClick={() => removePhoto(perspId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/70 text-white rounded-b-lg">
                        {PERSPECTIVES.find((p) => p.id === perspId)?.label}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0 space-y-3">
            {/* Show ID toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-id" className="text-sm">
                ID auf Collage anzeigen
              </Label>
              <Switch
                id="show-id"
                checked={showIdOnCollage}
                onCheckedChange={setShowIdOnCollage}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (currentHoofIndex > 0) {
                    goToHoof(currentHoofIndex - 1);
                  }
                }}
                disabled={currentHoofIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>

              {photosForCurrentHoof >= 1 ? (
                <Button
                  className="flex-1 bg-primary"
                  onClick={generateAndSaveCollage}
                  disabled={isGeneratingCollage}
                >
                  {isGeneratingCollage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Collage erstellen
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (currentHoofIndex < HOOVES.length - 1) {
                      goToHoof(currentHoofIndex + 1);
                    }
                  }}
                  disabled={currentHoofIndex === HOOVES.length - 1}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
