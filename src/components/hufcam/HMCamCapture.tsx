import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, Rocket, Sparkles, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Capture modes
type CaptureMode = "select" | "speed" | "pro" | "gallery";

interface HMCamCaptureProps {
  onPhotoCapture: (dataUrl: string, view: HoofView) => void;
  onCancel?: () => void;
  horseId?: string;
  className?: string;
}

export function HMCamCapture({
  onPhotoCapture,
  onCancel,
  horseId,
  className
}: HMCamCaptureProps) {
  // Mode selection
  const [captureMode, setCaptureMode] = useState<CaptureMode>("select");
  const [selectedView, setSelectedView] = useState<HoofView | null>(null);

  // Photo states
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Camera states (only for Pro mode)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speedInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Device orientation for Pro mode
  const { isLevel, tiltAngle, requestPermission: requestOrientationPermission } = useDeviceOrientation();

  const viewConfig = selectedView
    ? HOOF_VIEW_CONFIGS.find(c => c.id === selectedView)
    : null;

  // ============================================
  // SPEED CAM: Native Camera via input[capture]
  // ============================================
  const handleSpeedCamClick = () => {
    setCaptureMode("speed");
    // Trigger native camera
    speedInputRef.current?.click();
  };

  const handleSpeedCamCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCaptureMode("select");
      return;
    }

    // Convert to dataUrl for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (speedInputRef.current) speedInputRef.current.value = "";
  };

  // ============================================
  // GALLERY: File picker without capture
  // ============================================
  const handleGalleryClick = () => {
    setCaptureMode("gallery");
    galleryInputRef.current?.click();
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCaptureMode("select");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      setCaptureMode("select");
      return;
    }

    // Convert to dataUrl for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // ============================================
  // PRO MODE: Browser camera with guides
  // ============================================
  const handleProModeClick = async () => {
    setCaptureMode("pro");
    requestOrientationPermission();
  };

  // Start camera - MINIMAL constraints for stability
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      // MINIMAL constraints - stability over features!
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Kamera-Zugriff verweigert. Nutze Speed Cam oder Galerie."
          : "Kamera nicht verfügbar. Nutze Speed Cam oder Galerie."
      );
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Capture from browser camera
  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  // ============================================
  // UPLOAD: To Supabase Storage
  // ============================================
  const uploadToSupabase = async (dataUrl: string): Promise<string | null> => {
    if (!horseId) return dataUrl; // No horseId = skip cloud upload

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Convert dataUrl to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      setUploadProgress(30);

      // Generate filename
      const timestamp = Date.now();
      const viewId = selectedView || "unknown";
      const fileName = `${horseId}/${viewId}_${timestamp}.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("hoof_photos")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      setUploadProgress(60);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        toast.error("Cloud-Upload fehlgeschlagen");
        return dataUrl; // Return local dataUrl as fallback
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("hoof_photos")
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Save to database
      const { error: dbError } = await supabase
        .from("hoof_photos")
        .insert({
          horse_id: horseId,
          hoof_position: viewId,
          photo_url: fileName,
          url: publicUrl,
          file_path: fileName,
          taken_at: new Date().toISOString(),
        });

      setUploadProgress(100);

      if (dbError) {
        console.error("DB save error:", dbError);
        // Don't fail - photo is uploaded, just DB entry failed
      }

      return publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload fehlgeschlagen");
      return dataUrl;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ============================================
  // CONFIRM / RETAKE / RESET
  // ============================================
  const confirmPhoto = useCallback(async () => {
    if (!capturedPhoto || !selectedView) return;

    // Upload first (shows progress)
    await uploadToSupabase(capturedPhoto);

    // Notify parent
    onPhotoCapture(capturedPhoto, selectedView);

    // Reset
    setCapturedPhoto(null);
    setSelectedView(null);
    setCaptureMode("select");
  }, [capturedPhoto, selectedView, onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    if (captureMode === "pro") {
      startCamera();
    } else {
      // For speed/gallery, go back to that mode's input
      if (captureMode === "speed") speedInputRef.current?.click();
      if (captureMode === "gallery") galleryInputRef.current?.click();
    }
  }, [captureMode, startCamera]);

  const resetToModeSelect = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
    setSelectedView(null);
    setCaptureMode("select");
    setCameraError(null);
  }, [stopCamera]);

  // Start camera when pro mode + view selected
  useEffect(() => {
    if (captureMode === "pro" && selectedView && !isCameraActive && !capturedPhoto) {
      startCamera();
    }
  }, [captureMode, selectedView, isCameraActive, capturedPhoto, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Hidden file inputs */}
      <input
        ref={speedInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleSpeedCamCapture}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================
          STEP 1: MODE SELECTOR (Start Screen)
          ======================================== */}
      {captureMode === "select" && !selectedView && (
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-center mb-4">
            Aufnahme-Modus wählen
          </h3>

          {/* Speed Cam - Native Camera */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={handleSpeedCamClick}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Rocket className="h-7 w-7 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-500">Speed Cam</h4>
                <p className="text-sm text-muted-foreground">
                  Schnell & stabil. Nutzt die System-Kamera.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pro Mode - Browser Camera */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={handleProModeClick}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-primary">HM-Cam AI</h4>
                <p className="text-sm text-muted-foreground">
                  Mit Hilfslinien & Wasserwaage.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Upload */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={handleGalleryClick}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-7 w-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-500">Galerie</h4>
                <p className="text-sm text-muted-foreground">
                  Vorhandenes Foto hochladen.
                </p>
              </div>
            </CardContent>
          </Card>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full mt-4">
              Abbrechen
            </Button>
          )}
        </div>
      )}

      {/* ========================================
          STEP 2a: VIEW SELECTION (for Pro mode)
          ======================================== */}
      {captureMode === "pro" && !selectedView && !capturedPhoto && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={resetToModeSelect}>
              <X className="h-4 w-4 mr-1" /> Zurück
            </Button>
            <span className="text-sm text-muted-foreground">HM-Cam AI Modus</span>
          </div>
          <HoofViewSelector
            selectedView={selectedView}
            onViewSelect={setSelectedView}
          />
        </div>
      )}

      {/* ========================================
          STEP 2b: CAMERA VIEW (Pro mode only)
          ======================================== */}
      {captureMode === "pro" && selectedView && !capturedPhoto && (
        <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Guide Overlay */}
          {isCameraActive && viewConfig && (
            <CameraGuideOverlay
              view={selectedView}
              isLevel={isLevel}
              tiltAngle={tiltAngle}
              requiresLevel={viewConfig.requiresLevel}
            />
          )}

          {/* Camera Error - with fallback options */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
              <div className="text-center text-white space-y-4 max-w-xs">
                <p className="text-amber-400 font-medium">{cameraError}</p>
                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600"
                    onClick={() => { resetToModeSelect(); setTimeout(handleSpeedCamClick, 100); }}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Speed Cam nutzen
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => { resetToModeSelect(); setTimeout(handleGalleryClick, 100); }}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Aus Galerie wählen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetToModeSelect}>
                    Zurück
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={resetToModeSelect}
            >
              <X className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
              onClick={captureFromCamera}
              disabled={!isCameraActive}
            >
              <Camera className="h-7 w-7" />
            </Button>

            <div className="w-12" />
          </div>

          {/* View indicator */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium backdrop-blur-sm">
            {viewConfig?.icon} {viewConfig?.label}
          </div>
        </div>
      )}

      {/* ========================================
          STEP 3: PHOTO REVIEW (all modes)
          ======================================== */}
      {capturedPhoto && (
        <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
          <img
            src={capturedPhoto}
            alt="Aufgenommenes Foto"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-white font-medium mb-2">Speichere...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs h-2" />
            </div>
          )}

          {/* View Selection for Speed/Gallery mode */}
          {!selectedView && !isUploading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
              <p className="text-white font-medium mb-4">Welche Ansicht ist das?</p>
              <div className="w-full max-w-xs">
                <HoofViewSelector
                  selectedView={selectedView}
                  onViewSelect={setSelectedView}
                  compact
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 mt-4"
                onClick={resetToModeSelect}
              >
                Abbrechen
              </Button>
            </div>
          )}

          {/* Review Controls (only show when view is selected) */}
          {selectedView && !isUploading && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={retakePhoto}
              >
                <RotateCcw className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
                onClick={confirmPhoto}
              >
                <Check className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* View indicator */}
          {viewConfig && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium backdrop-blur-sm">
              {viewConfig.icon} {viewConfig.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
