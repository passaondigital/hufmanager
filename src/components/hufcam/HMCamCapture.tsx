import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, Image as ImageIcon, Zap, ZapOff, Wand2 } from "lucide-react";
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
  const [isAiEnabled, setIsAiEnabled] = useState(false); // Default: AUS für Performance
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (nur für AI Modus relevant)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA STARTEN ---
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // TRICK GEGEN FLACKERN:
      // Wenn AI aus ist: Simple Constraints (Browser entscheidet -> meist 30fps fix -> kein Flackern)
      // Wenn AI an ist: Höhere Auflösung bevorzugen
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: isAiEnabled 
          ? { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment' } // Minimalistisch für Speed
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      // Check auf Taschenlampe
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      // @ts-ignore - torch ist nicht im Standard TS Type, existiert aber
      setHasTorch(!!capabilities.torch);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Konnte Kamera nicht starten. Bitte Berechtigungen prüfen.");
    }
  };

  // Kamera Neustart wenn AI-Modus gewechselt wird
  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [isAiEnabled, capturedPhoto]);

  // --- TASCHENLAMPE ---
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: !isTorchOn }] });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      toast.error("Blitz konnte nicht geschaltet werden");
    }
  };

  // --- FOTO MACHEN ---
  const capturePhoto = () => {
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
      // Stream pausieren/stoppen spart Akku im Review Modus
    }
  };

  // --- GALERIE UPLOAD ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedView) {
      toast.error("Bitte wähle erst aus, welchen Huf du hochlädst (oben die Icons).");
      // Reset input damit man das gleiche Bild nochmal wählen kann
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload in Storage Bucket
      const timestamp = Date.now();
      const filePath = `uploads/${horseId || 'temp'}/${timestamp}_${file.name}`;
      
      const { path, error: uploadErr } = await uploadFile('hoof_photos', filePath, file);
      if (uploadErr) throw uploadErr;

      // 2. Public URL holen
      const { data: { publicUrl } } = supabase.storage
        .from('hoof_photos')
        .getPublicUrl(path!);

      // 3. In Datenbank eintragen (damit Collage Worker es findet)
      if (horseId) {
        const { error: dbError } = await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: publicUrl, // Hier nutzen wir die gefixte Spalte
          file_path: path,
          hoof_position: "unknown", // Oder aus Context
          notes: "gallery_upload",
          taken_at: new Date().toISOString()
        });
        if (dbError) console.error("DB Save Error", dbError);
      }

      // 4. Fertig melden an Parent
      onPhotoCapture(publicUrl, selectedView);
      toast.success("Bild aus Galerie geladen!");

    } catch (err) {
      console.error(err);
      toast.error("Upload fehlgeschlagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- BESTÄTIGEN ---
  const confirmPhoto = async () => {
    if (capturedPhoto && selectedView) {
      setIsUploading(true);
      try {
        // Blob aus DataURL erstellen
        const res = await fetch(capturedPhoto);
        const blob = await res.blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

        // Upload Prozess (wie oben)
        const timestamp = Date.now();
        const filePath = `captures/${horseId || 'temp'}/${timestamp}.jpg`;
        const { path, error } = await uploadFile('hoof_photos', filePath, file);
        
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('hoof_photos').getPublicUrl(path!);

        // DB Insert
        if (horseId) {
          await supabase.from('hoof_photos').insert({
            horse_id: horseId,
            photo_url: publicUrl,
            file_path: path,
            notes: isAiEnabled ? "ai_capture" : "quick_capture",
            taken_at: new Date().toISOString()
          });
        }

        onPhotoCapture(publicUrl, selectedView);

      } catch (err) {
        toast.error("Fehler beim Speichern");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // --- RENDER ---
  return (
    <div className={cn("relative flex flex-col h-full bg-black", className)}>
      
      {/* HEADER: AI Toggle & Blitz */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
          <Wand2 className={cn("w-4 h-4", isAiEnabled ? "text-orange-500" : "text-gray-400")} />
          <Label htmlFor="ai-mode" className="text-xs text-white font-medium cursor-pointer">AI-Mode</Label>
          <Switch 
            id="ai-mode" 
            checked={isAiEnabled} 
            onCheckedChange={setIsAiEnabled}
            className="data-[state=checked]:bg-orange-500 scale-75"
          />
        </div>
        
        {hasTorch && !capturedPhoto && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={toggleTorch}
          >
            {isTorchOn ? <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> : <ZapOff className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {/* VIEWFINDER BEREICH */}
      <div className="relative flex-1 bg-black overflow-hidden mt-14">
        {!capturedPhoto ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* OVERLAYS (Nur wenn AI an ist) */}
            {isAiEnabled && selectedView && (
              <CameraGuideOverlay 
                view={selectedView}
                isLevel={isLevel}
                tiltAngle={tiltAngle}
                requiresLevel={HOOF_VIEW_CONFIGS.find(c => c.id === selectedView)?.requiresLevel || false}
              />
            )}
          </>
        ) : (
          <img 
            src={capturedPhoto} 
            alt="Review" 
            className="absolute inset-0 w-full h-full object-contain bg-black" 
          />
        )}
      </div>

      {/* CONTROLS UNTEN */}
      <div className="flex flex-col gap-4 p-4 bg-black/90 pb-8">
        
        {/* Ansicht wählen (Wenn noch kein Foto) */}
        {!capturedPhoto && (
          <div className="overflow-x-auto pb-2">
            <HoofViewSelector 
              selectedView={selectedView} 
              onViewSelect={setSelectedView} 
              className="mb-2"
            />
          </div>
        )}

        <div className="flex justify-between items-center px-4">
          {/* LINKER BUTTON: Galerie oder Retake */}
          {capturedPhoto ? (
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-red-500/50 text-red-500 hover:bg-red-950" onClick={retakePhoto}>
              <RotateCcw className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-white/20 bg-white/10 text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImageIcon className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* MITTLERER BUTTON: Auslöser oder Speichern */}
          {capturedPhoto ? (
             <Button 
               size="lg" 
               className="h-16 px-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
               onClick={confirmPhoto}
               disabled={isUploading}
             >
               {isUploading ? "Speichert..." : "Speichern & Weiter"}
               {!isUploading && <Check className="ml-2 h-5 w-5" />}
             </Button>
          ) : (
            <Button
              size="icon"
              className={cn(
                "h-20 w-20 rounded-full border-4 border-white shadow-lg transition-all active:scale-95",
                selectedView ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 cursor-not-allowed"
              )}
              onClick={capturePhoto}
              disabled={!selectedView}
            >
              <Camera className="h-8 w-8 text-white" />
            </Button>
          )}

          {/* RECHTER BUTTON: Abbrechen (nur im Kamera Modus sichtbar) */}
          {!capturedPhoto && (
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white/50" onClick={onCancel}>
              <X className="h-8 w-8" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
