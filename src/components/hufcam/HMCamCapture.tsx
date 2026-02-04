import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, Image as ImageIcon, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Die drei Capture-Modi
type CaptureMode = "ai" | "live" | "gallery";

interface HMCamCaptureProps {
  onPhotoCapture: (dataUrl: string, view: HoofView) => void;
  onCancel?: () => void;
  className?: string;
  horseId?: string;
}

const MODE_CONFIG: Record<CaptureMode, { label: string; description: string; icon: string }> = {
  ai: { 
    label: "AI Kamera", 
    description: "Mit Hilfslinien & Level-Check", 
    icon: "🤖" 
  },
  live: { 
    label: "Live Cam", 
    description: "Stabil, ohne Overlays", 
    icon: "📹" 
  },
  gallery: { 
    label: "Galerie", 
    description: "Foto aus Galerie wählen", 
    icon: "🖼️" 
  },
};

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
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (für Option A - AI Mode)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA STARTEN ---
  const startCamera = useCallback(async () => {
    // Gallery mode braucht keine Kamera
    if (captureMode === "gallery") {
      stopCamera();
      return;
    }

    try {
      // Alten Stream stoppen
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Constraints je nach Modus
      // Option A (AI): Höhere Auflösung für bessere Details
      // Option B (Live): Einfachste Settings für max. Stabilität
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: captureMode === "ai" 
          ? { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: "environment" }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      // Check ob Blitz verfügbar ist
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() || {};
      // @ts-ignore - torch ist nicht im Standard-Typen
      setHasTorch(!!capabilities.torch);
      setIsCameraReady(true);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Kamera konnte nicht gestartet werden");
      setIsCameraReady(false);
    }
  }, [captureMode]);

  // --- KAMERA STOPPEN ---
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Kamera bei Modus-Wechsel neu starten
  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [captureMode, capturedPhoto, startCamera, stopCamera]);

  // --- BLITZ TOGGLE ---
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      // @ts-ignore - torch constraint nicht im Standard
      await track.applyConstraints({ advanced: [{ torch: !isTorchOn }] });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      toast.error("Blitz nicht verfügbar");
    }
  }, [isTorchOn]);

  // --- FOTO AUFNEHMEN (Option A & B) ---
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

  // --- UPLOAD PROZESS (für alle Modi) ---
  const processAndUpload = useCallback(async (blob: Blob) => {
    if (!selectedView) {
      toast.error("Bitte erst Ansicht wählen!");
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const filePath = `uploads/${horseId || "temp"}/${fileName}`;
      
      // 1. Upload zu Storage
      const { error: uploadErr } = await supabase.storage
        .from("hoof_photos")
        .upload(filePath, blob, { contentType: "image/jpeg" });
      
      if (uploadErr) throw uploadErr;

      // 2. Public URL holen
      const { data: { publicUrl } } = supabase.storage
        .from("hoof_photos")
        .getPublicUrl(filePath);

      // 3. Datenbank-Eintrag
      if (horseId) {
        await supabase.from("hoof_photos").insert({
          horse_id: horseId,
          photo_url: publicUrl,
          file_path: filePath,
          hoof_position: selectedView,
          notes: `capture_mode:${captureMode}`,
          taken_at: new Date().toISOString()
        });
      }

      onPhotoCapture(publicUrl, selectedView);
      toast.success("Foto gespeichert!");
      
      // Reset
      setCapturedPhoto(null);
      setIsUploading(false);

    } catch (err) {
      console.error("Upload Fehler:", err);
      toast.error("Speichern fehlgeschlagen");
      setIsUploading(false);
    }
  }, [selectedView, horseId, captureMode, onPhotoCapture]);

  // --- GALERIE UPLOAD (Option C) ---
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedView) {
      toast.error("Bitte erst Ansicht wählen!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    await processAndUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedView, processAndUpload]);

  // --- BESTÄTIGEN ---
  const confirmPhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    const res = await fetch(capturedPhoto);
    const blob = await res.blob();
    await processAndUpload(blob);
  }, [capturedPhoto, processAndUpload]);

  // --- WIEDERHOLEN ---
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setIsUploading(false);
  }, []);

  // Aktuelle View-Config für Overlay
  const currentViewConfig = selectedView 
    ? HOOF_VIEW_CONFIGS.find(c => c.id === selectedView) 
    : null;

  return (
    <div className={cn("flex flex-col bg-black text-white", className)}>
      {/* Hidden File Input für Galerie */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* --- MODUS AUSWAHL (3 TABS) --- */}
      <div className="flex gap-1 p-2 bg-black/80">
        {(Object.keys(MODE_CONFIG) as CaptureMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setCaptureMode(mode)}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
              captureMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            <span className="block text-lg mb-0.5">{MODE_CONFIG[mode].icon}</span>
            <span className="block">{MODE_CONFIG[mode].label}</span>
          </button>
        ))}
      </div>

      {/* Modus-Beschreibung */}
      <div className="text-center py-1 text-xs text-white/60 bg-black/60">
        {MODE_CONFIG[captureMode].description}
      </div>

      {/* --- VIEWFINDER / GALERIE BEREICH --- */}
      <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
        {captureMode === "gallery" ? (
          // OPTION C: Galerie-Modus
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-white/60" />
            </div>
            <p className="text-white/80 text-center">
              Wähle ein Foto aus deiner Galerie
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedView || isUploading}
              className="bg-primary hover:bg-primary/90"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {isUploading ? "Wird hochgeladen..." : "Galerie öffnen"}
            </Button>
            {!selectedView && (
              <p className="text-yellow-400 text-xs">
                ⚠️ Bitte erst unten eine Ansicht wählen!
              </p>
            )}
          </div>
        ) : !capturedPhoto ? (
          // OPTION A & B: Live Kamera
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* OPTION A: AI Overlays (nur wenn AI Modus aktiv) */}
            {captureMode === "ai" && selectedView && currentViewConfig && (
              <CameraGuideOverlay
                view={selectedView}
                isLevel={isLevel}
                tiltAngle={tiltAngle}
                requiresLevel={currentViewConfig.requiresLevel}
              />
            )}

            {/* Blitz-Button */}
            {hasTorch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTorch}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              >
                {isTorchOn ? <Zap className="w-5 h-5 text-yellow-400" /> : <ZapOff className="w-5 h-5" />}
              </Button>
            )}
          </>
        ) : (
          // VORSCHAU des aufgenommenen Fotos
          <img
            src={capturedPhoto}
            alt="Aufgenommenes Foto"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* --- ANSICHT WÄHLEN --- */}
      {!capturedPhoto && (
        <div className="p-3 bg-black/80">
          <HoofViewSelector
            selectedView={selectedView}
            onViewSelect={setSelectedView}
            compact
          />
        </div>
      )}

      {/* --- CONTROLS --- */}
      <div className="p-4 bg-black/90 space-y-3">
        {capturedPhoto ? (
          // Bestätigen / Wiederholen
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={retakePhoto}
              disabled={isUploading}
              className="flex-1 border-white/30 text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Nochmal
            </Button>
            <Button
              onClick={confirmPhoto}
              disabled={isUploading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {isUploading ? "Speichert..." : "Speichern"}
            </Button>
          </div>
        ) : captureMode !== "gallery" ? (
          // Kamera Controls (Option A & B)
          <div className="flex items-center justify-center gap-4">
            {/* Abbrechen */}
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            )}

            {/* Auslöser */}
            <button
              onClick={capturePhoto}
              disabled={!selectedView || !isCameraReady}
              className={cn(
                "w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all",
                selectedView && isCameraReady
                  ? "bg-white/20 hover:bg-white/30 active:scale-95"
                  : "bg-white/5 opacity-50 cursor-not-allowed"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Galerie Shortcut */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedView}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ImageIcon className="w-6 h-6" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
