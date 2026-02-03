import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, Image as ImageIcon, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";

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
  const [selectedView, setSelectedView] = useState<HoofView | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (Wasserwaage)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA LOGIK (STABIL) ---
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Einfache Constraints für Stabilität, keine FrameRate
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: isAiEnabled 
          ? { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      // Check Torch
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setHasTorch(!!capabilities?.torch);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Kamera konnte nicht gestartet werden.");
    }
  }, [isAiEnabled]);

  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [capturedPhoto, startCamera]);

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

  // --- UPLOAD PROCESS ---
  const processAndUpload = useCallback(async (fileOrBlob: File | Blob) => {
    if (!selectedView) return;
    
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const filePath = `uploads/${horseId || 'temp'}/${fileName}`;
      
      // 1. Storage Upload
      const { path, error: uploadErr } = await uploadFile('hoof_photos', filePath, fileOrBlob);
      if (uploadErr) throw uploadErr;

      // 2. Public URL
      const { data: { publicUrl } } = supabase.storage.from('hoof_photos').getPublicUrl(path!);

      // 3. Datenbank
      if (horseId) {
        await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: publicUrl,
          file_path: path,
          hoof_position: selectedView,
          notes: isAiEnabled ? "ai_capture" : "live_capture",
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
  }, [selectedView, horseId, isAiEnabled, onPhotoCapture]);

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

      {/* Top Bar: AI Toggle + Torch */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Switch 
            id="ai-mode" 
            checked={isAiEnabled} 
            onCheckedChange={setIsAiEnabled}
            disabled={!!capturedPhoto}
          />
          <Label htmlFor="ai-mode" className="text-xs font-medium">
            {isAiEnabled ? "AI AKTIV" : "LIVE CAM"}
          </Label>
        </div>
        
        {hasTorch && !capturedPhoto && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTorch}
            className="h-8 w-8"
          >
            {isTorchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* View Selector */}
      {!capturedPhoto && (
        <HoofViewSelector
          selectedView={selectedView}
          onViewSelect={setSelectedView}
        />
      )}

      {/* Viewfinder / Preview */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        {!capturedPhoto ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Guide Overlay (nur bei AI Modus) */}
            {isAiEnabled && selectedView && currentViewConfig && (
              <CameraGuideOverlay
                view={selectedView}
                isLevel={isLevel}
                tiltAngle={tiltAngle}
                requiresLevel={currentViewConfig.requiresLevel}
              />
            )}
            
            {/* Hint (nur wenn keine Guides) */}
            {!isAiEnabled && currentViewConfig && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs p-2 rounded">
                {currentViewConfig.hint}
              </div>
            )}
          </>
        ) : (
          <img 
            src={capturedPhoto} 
            alt="Aufgenommenes Foto" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {capturedPhoto ? (
          // Review Mode
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
        ) : (
          // Capture Mode
          <>
            {/* Galerie */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !selectedView}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            {/* Auslöser */}
            <Button
              onClick={capturePhoto}
              disabled={!selectedView || isUploading}
              className="flex-1 gap-2"
            >
              <Camera className="h-4 w-4" />
              Aufnehmen
            </Button>
            
            {/* Abbrechen */}
            {onCancel && (
              <Button
                variant="outline"
                size="icon"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Hinweis */}
      {!selectedView && !capturedPhoto && (
        <p className="text-xs text-muted-foreground text-center">
          Wähle zuerst eine Huf-Ansicht aus
        </p>
      )}
    </div>
  );
}
