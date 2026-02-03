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
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (Wasserwaage)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA LOGIK (STABIL - Keine FrameRate) ---
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Einfachste Constraints für Stabilität
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      // Check ob Blitz verfügbar
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setHasTorch(!!capabilities?.torch);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Kamera konnte nicht gestartet werden.");
    }
  }, []);

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
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) {
        await track.applyConstraints({
          advanced: [{ torch: !isTorchOn } as MediaTrackConstraintSet]
        });
        setIsTorchOn(!isTorchOn);
      }
    } catch (err) {
      console.error("Torch Fehler:", err);
    }
  }, [isTorchOn]);

  // --- FOTO AUFNEHMEN ---
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !selectedView) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
  }, [selectedView]);

  // --- SPEICHERN & UPLOAD ---
  const savePhoto = useCallback(async () => {
    if (!capturedPhoto || !selectedView) return;
    
    setIsUploading(true);
    
    try {
      // Upload zu Supabase wenn horseId vorhanden
      if (horseId) {
        const blob = await (await fetch(capturedPhoto)).blob();
        const fileName = `${horseId}/${selectedView}_${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('hoof_photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;

        // In DB speichern
        const { data: urlData } = supabase.storage
          .from('hoof_photos')
          .getPublicUrl(fileName);

        await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: urlData.publicUrl,
          hoof_position: selectedView,
          taken_at: new Date().toISOString(),
        });
      }
      
      // Callback aufrufen
      onPhotoCapture(capturedPhoto, selectedView);
      toast.success("Foto gespeichert!");
      
      // Reset für nächstes Foto
      setCapturedPhoto(null);
      setSelectedView(null);
      
    } catch (err) {
      console.error("Upload Fehler:", err);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setIsUploading(false);
    }
  }, [capturedPhoto, selectedView, horseId, onPhotoCapture]);

  // --- GALERIE UPLOAD ---
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedView) return;
    
    setIsUploading(true);
    
    try {
      // Bild als DataURL lesen
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        if (horseId) {
          const fileName = `${horseId}/${selectedView}_${Date.now()}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('hoof_photos')
            .upload(fileName, file, { contentType: file.type });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('hoof_photos')
              .getPublicUrl(fileName);

            await supabase.from('hoof_photos').insert({
              horse_id: horseId,
              photo_url: urlData.publicUrl,
              hoof_position: selectedView,
              taken_at: new Date().toISOString(),
            });
          }
        }
        
        onPhotoCapture(dataUrl, selectedView);
        toast.success("Foto hochgeladen!");
        setSelectedView(null);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
      
    } catch (err) {
      console.error("Upload Fehler:", err);
      toast.error("Upload fehlgeschlagen");
      setIsUploading(false);
    }
    
    // Input zurücksetzen
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedView, horseId, onPhotoCapture]);

  // --- RETAKE ---
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  // Aktueller View Config
  const currentViewConfig = selectedView 
    ? HOOF_VIEW_CONFIGS.find(v => v.id === selectedView)
    : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* View Selector */}
      {!capturedPhoto && (
        <HoofViewSelector
          selectedView={selectedView}
          onViewSelect={setSelectedView}
        />
      )}

      {/* Kamera / Vorschau */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        {capturedPhoto ? (
          // Review Screen
          <img 
            src={capturedPhoto} 
            alt="Aufgenommenes Foto" 
            className="w-full h-full object-cover"
          />
        ) : (
          // Live Kamera
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Guide Overlay */}
            {selectedView && currentViewConfig && (
              <CameraGuideOverlay
                view={selectedView}
                isLevel={isLevel}
                tiltAngle={tiltAngle}
                requiresLevel={currentViewConfig.requiresLevel}
              />
            )}
            
            {/* Hint */}
            {currentViewConfig && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs p-2 rounded">
                {currentViewConfig.hint}
              </div>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      {capturedPhoto ? (
        // Review Buttons
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={retakePhoto}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Wiederholen
          </Button>
          <Button 
            onClick={savePhoto}
            disabled={isUploading}
            className="flex-1 gap-2"
          >
            <Check className="h-4 w-4" />
            {isUploading ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      ) : (
        // Capture Buttons
        <div className="flex gap-2">
          {/* Torch Button */}
          {hasTorch && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTorch}
            >
              {isTorchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Galerie Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedView}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          {/* Capture Button */}
          <Button
            onClick={capturePhoto}
            disabled={!selectedView}
            className="flex-1 gap-2"
          >
            <Camera className="h-4 w-4" />
            Foto aufnehmen
          </Button>
        </div>
      )}
      
      {/* Keine View gewählt Hinweis */}
      {!selectedView && !capturedPhoto && (
        <p className="text-xs text-muted-foreground text-center">
          Wähle zuerst eine Huf-Ansicht aus
        </p>
      )}
    </div>
  );
}
