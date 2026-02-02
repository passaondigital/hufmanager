import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, Zap, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
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
  const [selectedView, setSelectedView] = useState<HoofView | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Torch state
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const viewConfig = selectedView 
    ? HOOF_VIEW_CONFIGS.find(c => c.id === selectedView) 
    : null;

  // Simple camera start - NO frameRate constraints to avoid flicker
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);

        // Check torch support
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
          setTorchSupported(caps?.torch === true);
        } catch {
          setTorchSupported(false);
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen."
          : "Kamera konnte nicht gestartet werden."
      );
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      // Turn off torch if on
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track && torchOn) {
          track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
          setTorchOn(false);
        }
      } catch {}

      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, [torchOn]);

  // Toggle torch with proper type casting
  const toggleTorch = useCallback(async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      
      const newTorchState = !torchOn;
      await track.applyConstraints({ 
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet] 
      });
      setTorchOn(newTorchState);
    } catch (err) {
      console.error('Torch toggle failed', err);
      toast.error('Taschenlampe konnte nicht geschaltet werden');
    }
  }, [torchOn]);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  // Trigger file input for gallery upload
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection from gallery
  const handleFileSelected = useCallback(async (file?: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setCapturedPhoto(previewUrl);
      stopCamera();
    } catch (error) {
      console.error('Error handling file', error);
      toast.error('Fehler beim Laden des Fotos');
    } finally {
      setIsUploading(false);
    }
  }, [stopCamera]);

  // Save photo to Supabase and notify parent
  const saveAndClose = useCallback(async () => {
    if (!capturedPhoto || !selectedView) return;

    setIsUploading(true);
    try {
      // Convert dataUrl or blob URL to blob
      let blob: Blob;
      if (capturedPhoto.startsWith('data:')) {
        const res = await fetch(capturedPhoto);
        blob = await res.blob();
      } else if (capturedPhoto.startsWith('blob:')) {
        const res = await fetch(capturedPhoto);
        blob = await res.blob();
      } else {
        toast.error('Ungültiges Bildformat');
        return;
      }

      const filename = `${selectedView}_${Date.now()}.jpg`;
      const path = `hoof_photos/${filename}`;

      // Upload to storage
      const { path: uploadedPath, error: uploadErr } = await uploadFile('hoof_photos', path, blob, { upsert: true });
      if (uploadErr || !uploadedPath) {
        console.error('Upload failed', uploadErr);
        toast.error('Upload fehlgeschlagen');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('hoof_photos').getPublicUrl(uploadedPath);
      const publicUrl = urlData.publicUrl;

      // Save to database if horseId provided
      if (horseId) {
        const position = selectedView.split('_')[0]; // e.g., 'vl' from 'vl_front'
        
        const { error: dbError } = await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: publicUrl,
          hoof_position: position,
          taken_at: new Date().toISOString(),
        });

        if (dbError) {
          console.error('DB insert failed', dbError);
          toast.error('Foto konnte nicht gespeichert werden');
        } else {
          toast.success('Foto gespeichert!');
        }
      }

      // Notify parent with public URL
      onPhotoCapture(publicUrl, selectedView);
      
      // Reset state
      setCapturedPhoto(null);
      setSelectedView(null);

    } catch (error) {
      console.error('Error saving photo', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsUploading(false);
    }
  }, [capturedPhoto, selectedView, horseId, onPhotoCapture]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    if (capturedPhoto?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera, capturedPhoto]);

  // Reset to view selection
  const resetToViewSelection = useCallback(() => {
    stopCamera();
    if (capturedPhoto?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    setSelectedView(null);
  }, [stopCamera, capturedPhoto]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start camera when view is selected
  useEffect(() => {
    if (selectedView && !isCameraActive && !capturedPhoto) {
      startCamera();
    }
  }, [selectedView, isCameraActive, capturedPhoto, startCamera]);

  // Handle file input change
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
    e.currentTarget.value = "";
  }, [handleFileSelected]);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Step 1: View Selection */}
      {!selectedView && (
        <div className="p-4 space-y-4">
          <HoofViewSelector 
            selectedView={selectedView}
            onViewSelect={setSelectedView}
          />
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="w-full"
            >
              Abbrechen
            </Button>
          )}
        </div>
      )}

      {/* Step 2: Camera View */}
      {selectedView && !capturedPhoto && (
        <div className="space-y-4">
          {/* View indicator */}
          <div className="flex items-center justify-between px-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetToViewSelection}
            >
              <X className="h-4 w-4 mr-1" />
              Zurück
            </Button>
            <span className="text-sm font-medium">
              {viewConfig?.label || selectedView}
            </span>
          </div>

          {/* Camera container */}
          <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startCamera}
                  className="mt-4"
                >
                  Erneut versuchen
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Simple guide hint */}
                {viewConfig && (
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="px-3 py-2 rounded-lg text-center text-sm font-medium bg-background/80 backdrop-blur-sm">
                      {viewConfig.hint}
                    </div>
                  </div>
                )}

                {/* Torch button */}
                {torchSupported && (
                  <Button
                    variant={torchOn ? "default" : "secondary"}
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={toggleTorch}
                  >
                    <Zap className={cn("h-4 w-4", torchOn && "text-yellow-500")} />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Capture buttons */}
          <div className="flex gap-2 px-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={triggerFileInput}
            >
              <Upload className="h-4 w-4" />
              Galerie
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={capturePhoto}
              disabled={!isCameraActive}
            >
              <Camera className="h-4 w-4" />
              Aufnehmen
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review captured photo */}
      {capturedPhoto && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium">
              {viewConfig?.label || selectedView}
            </span>
          </div>

          {/* Preview */}
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            <img 
              src={capturedPhoto} 
              alt="Captured" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={retakePhoto}
              disabled={isUploading}
            >
              <RotateCcw className="h-4 w-4" />
              Nochmal
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={saveAndClose}
              disabled={isUploading}
            >
              <Check className="h-4 w-4" />
              {isUploading ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
