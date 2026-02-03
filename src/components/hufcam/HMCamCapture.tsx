import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, Image as ImageIcon, Zap, ZapOff, Wand2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";

type CaptureMode = "ai" | "live" | "gallery";

interface HMCamCaptureProps {
  onPhotoCapture: (dataUrl: string, view: HoofView) => void;
  onCancel?: () => void;
  className?: string;
  horseId?: string;
}

export function HMCamCapture({ 
  onPhotoCapture, 
  onCancel,
  className,
  horseId,
}: HMCamCaptureProps) {
  // --- STATE ---
  const [captureMode, setCaptureMode] = useState<CaptureMode>("live");
  const [selectedView, setSelectedView] = useState<HoofView | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (nur für AI Modus)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA LOGIK ---
  const startCamera = useCallback(async () => {
    if (captureMode === "gallery") return;
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // AI Modus: Höhere Auflösung für Details
      // Live Modus: Einfachste Settings für Stabilität
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: captureMode === "ai" 
          ? { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);

      // Check Torch
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setHasTorch(!!capabilities?.torch);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Kamera konnte nicht gestartet werden.");
      setCameraActive(false);
    }
  }, [captureMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setIsTorchOn(false);
  }, []);

  useEffect(() => {
    if (!capturedPhoto && captureMode !== "gallery") {
      startCamera();
    } else if (captureMode === "gallery") {
      stopCamera();
    }
    return () => stopCamera();
  }, [captureMode, capturedPhoto, startCamera, stopCamera]);

  // --- TORCH TOGGLE ---
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ 
        advanced: [{ torch: !isTorchOn } as MediaTrackConstraintSet] 
      });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      toast.error("Blitz nicht verfügbar");
    }
  }, [isTorchOn]);

  // --- FOTO AUFNEHMEN ---
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !selectedView) {
      toast.error("Bitte erst eine Ansicht wählen!");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
    }
  }, [selectedView]);

  // --- UPLOAD PROCESS (Zentral für alle Modi) ---
  const processAndUpload = useCallback(async (fileOrBlob: File | Blob) => {
    if (!selectedView) return;
    
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const filePath = `uploads/${horseId || 'temp'}/${fileName}`;
      
      // Storage Upload
      const { path, error: uploadErr } = await uploadFile('hoof_photos', filePath, fileOrBlob);
      if (uploadErr) throw uploadErr;

      // Public URL
      const { data: { publicUrl } } = supabase.storage.from('hoof_photos').getPublicUrl(path!);

      // Datenbank
      if (horseId) {
        await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: publicUrl,
          file_path: path,
          hoof_position: selectedView,
          notes: `${captureMode}_capture`,
          taken_at: new Date().toISOString()
        });
      }

      onPhotoCapture(publicUrl, selectedView);
      toast.success("Foto gespeichert!");
      
      // Reset
      setCapturedPhoto(null);
      setSelectedView(null);

    } catch (err) {
      console.error(err);
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setIsUploading(false);
    }
  }, [selectedView, horseId, captureMode, onPhotoCapture]);

  // --- GALERIE UPLOAD ---
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedView) {
      await processAndUpload(file);
    } else if (!selectedView) {
      toast.error("Bitte erst Ansicht wählen!");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedView, processAndUpload]);

  // --- CONFIRM / RETAKE ---
  const confirmPhoto = useCallback(async () => {
    if (capturedPhoto) {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      await processAndUpload(blob);
    }
  }, [capturedPhoto, processAndUpload]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setIsUploading(false);
  }, []);

  // Current View Config
  const currentViewConfig = selectedView 
    ? HOOF_VIEW_CONFIGS.find(v => v.id === selectedView)
    : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Mode Selector - 3 Optionen */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setCaptureMode("ai")}
          disabled={!!capturedPhoto}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
            captureMode === "ai" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-background/50"
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>AI Kamera</span>
        </button>
        <button
          onClick={() => setCaptureMode("live")}
          disabled={!!capturedPhoto}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
            captureMode === "live" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-background/50"
          )}
        >
          <Video className="h-3.5 w-3.5" />
          <span>Live Cam</span>
        </button>
        <button
          onClick={() => setCaptureMode("gallery")}
          disabled={!!capturedPhoto}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
            captureMode === "gallery" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-background/50"
          )}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Galerie</span>
        </button>
      </div>

      {/* Mode Description */}
      <p className="text-[11px] text-muted-foreground text-center px-2">
        {captureMode === "ai" && "Mit Hilfslinien & Wasserwaage für optimale Aufnahmen"}
        {captureMode === "live" && "Schnelle Aufnahme ohne Analyse – maximale Stabilität"}
        {captureMode === "gallery" && "Foto aus Galerie hochladen – ohne Analyse"}
      </p>

      {/* View Selector */}
      {!capturedPhoto && (
        <HoofViewSelector
          selectedView={selectedView}
          onViewSelect={setSelectedView}
        />
      )}

      {/* Viewfinder / Preview / Gallery Placeholder */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        {capturedPhoto ? (
          // Review Mode
          <img 
            src={capturedPhoto} 
            alt="Aufgenommenes Foto" 
            className="w-full h-full object-cover"
          />
        ) : captureMode === "gallery" ? (
          // Gallery Mode Placeholder
          <div 
            className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => selectedView ? fileInputRef.current?.click() : toast.error("Bitte erst Ansicht wählen!")}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Foto aus Galerie wählen</p>
              <p className="text-xs text-muted-foreground">Tippen zum Öffnen</p>
            </div>
          </div>
        ) : (
          // Camera Mode (AI or Live)
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* AI Mode: Guide Overlay */}
            {captureMode === "ai" && selectedView && currentViewConfig && (
              <CameraGuideOverlay
                view={selectedView}
                isLevel={isLevel}
                tiltAngle={tiltAngle}
                requiresLevel={currentViewConfig.requiresLevel}
              />
            )}
            
            {/* Live Mode: Simple Hint */}
            {captureMode === "live" && currentViewConfig && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs p-2 rounded">
                {currentViewConfig.hint}
              </div>
            )}
            
            {/* Torch Button (Top Right) */}
            {hasTorch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTorch}
                className="absolute top-2 right-2 h-10 w-10 bg-black/40 hover:bg-black/60 text-white"
              >
                {isTorchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {capturedPhoto ? (
          // Review Buttons
          <>
            <Button 
              variant="outline" 
              onClick={retakePhoto}
              disabled={isUploading}
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Nochmal
            </Button>
            <Button 
              onClick={confirmPhoto}
              disabled={isUploading}
              className="flex-1 gap-2"
            >
              {isUploading ? "Speichert..." : "Speichern"}
              {!isUploading && <Check className="h-4 w-4" />}
            </Button>
          </>
        ) : captureMode === "gallery" ? (
          // Gallery Button
          <>
            <Button
              onClick={() => selectedView ? fileInputRef.current?.click() : toast.error("Bitte erst Ansicht wählen!")}
              disabled={isUploading || !selectedView}
              className="flex-1 gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Foto auswählen
            </Button>
            {onCancel && (
              <Button variant="outline" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          // Camera Buttons (AI or Live)
          <>
            <Button
              onClick={capturePhoto}
              disabled={!selectedView || isUploading}
              className="flex-1 gap-2"
            >
              <Camera className="h-4 w-4" />
              Aufnehmen
            </Button>
            {onCancel && (
              <Button variant="outline" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Hinweis wenn keine View gewählt */}
      {!selectedView && !capturedPhoto && (
        <p className="text-xs text-muted-foreground text-center">
          ↑ Wähle zuerst eine Huf-Ansicht aus
        </p>
      )}
    </div>
  );
}
