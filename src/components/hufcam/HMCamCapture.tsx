import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  horseId?: string; // optional - if provided, photo will be saved to that horse
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  // remove canvas-based capture flow and keep a hidden file input for fast uploads
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { 
    isLevel, 
    tiltAngle, 
    hasPermission: hasOrientationPermission,
    isSupported: isOrientationSupported,
    requestPermission: requestOrientationPermission 
  } = useDeviceOrientation();

  const viewConfig = selectedView 
    ? HOOF_VIEW_CONFIGS.find(c => c.id === selectedView) 
    : null;

  // Request orientation permission once on mount (for iOS)
  useEffect(() => {
    if (isOrientationSupported && !hasOrientationPermission) {
      requestOrientationPermission();
    }
  }, [isOrientationSupported, hasOrientationPermission, requestOrientationPermission]);

  // Start camera stream - no orientation dependencies to prevent restarts
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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
          ? "Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen."
          : "Kamera konnte nicht gestartet werden."
      );
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Trigger file input so mobile camera UI or file picker opens.
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection: upload immediately and save DB record
  const handleFileSelected = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filename = `${selectedView || 'unknown'}_${Date.now()}.${fileExt}`;
      const path = `hoof_photos/${filename}`;

      // Show a quick preview using an object URL
      const previewUrl = URL.createObjectURL(file);
      setCapturedPhoto(previewUrl);
      // Stop camera to reduce CPU/bandwidth
      stopCamera();

      // Upload to supabase storage (bucket: hoof_photos)
      const { path: uploadedPath, error: uploadErr } = await uploadFile('hoof_photos', path, file, { upsert: true });
      if (uploadErr || !uploadedPath) {
        console.error('Upload failed', uploadErr);
        toast.error('Upload fehlgeschlagen');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('hoof_photos').getPublicUrl(uploadedPath);
      const publicUrl = urlData.publicUrl;

      // Save a DB record if horseId is available
      // Use photo_url (required) and also set file_path
      if (horseId) {
        const { error: dbError } = await supabase.from('hoof_photos').insert({
          horse_id: horseId,
          photo_url: publicUrl,
          file_path: uploadedPath,
        });

        if (dbError) {
          console.error('DB insert failed', dbError);
          toast.error('Foto konnte nicht in DB gespeichert werden');
          // still call onPhotoCapture with the public URL so the UI remains responsive
        }
      } else {
        // If no horseId provided, warn but continue (user can assign later)
        toast.warning('Kein Pferd ausgewählt. Foto wurde hochgeladen, aber nicht zugeordnet.');
      }

      // Notify parent with the public URL (so modal shows the uploaded image)
      if (selectedView) {
        onPhotoCapture(publicUrl, selectedView);
      } else {
        // fallback to generic view
        onPhotoCapture(publicUrl, (HOOF_VIEW_CONFIGS[0]?.id as HoofView) || ('vl' as HoofView));
      }

      toast.success('Foto hochgeladen');
    } catch (error) {
      console.error('Error handling selected file', error);
      toast.error('Fehler beim Verarbeiten des Fotos');
    }
  }, [onPhotoCapture, selectedView, stopCamera, horseId]);

  // Confirm captured photo (keeps the previous API but now expects publicUrls)
  const confirmPhoto = useCallback(() => {
    if (capturedPhoto && selectedView) {
      onPhotoCapture(capturedPhoto, selectedView);
      setCapturedPhoto(null);
      setSelectedView(null);
    }
  }, [capturedPhoto, selectedView, onPhotoCapture]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    // release any object URL
    if (capturedPhoto && capturedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera, capturedPhoto]);

  // Reset to view selection
  const resetToViewSelection = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
    setSelectedView(null);
  }, [stopCamera]);

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

  // Handle native file input changes
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file);
    // Reset input so the same file can be selected again if needed
    e.currentTarget.value = "";
  }, [handleFileSelected]);

  return (
    <div className={cn("flex flex-col", className)}>
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

      {/* Step 2: Camera View with Guides */}
      {selectedView && !capturedPhoto && (
        <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Hidden file input for fast camera capture / gallery pick */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
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

          {/* Camera Error */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <div className="text-center text-white space-y-3">
                <Smartphone className="h-12 w-12 mx-auto text-red-400" />
                <p className="text-sm">{cameraError}</p>
                <Button variant="secondary" size="sm" onClick={startCamera}>
                  Erneut versuchen
                </Button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={resetToViewSelection}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
              onClick={triggerFileInput}
            >
              <Camera className="h-7 w-7" />
            </Button>
            
            <div className="w-12" /> {/* Spacer for alignment */}
          </div>

          {/* View indicator */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium backdrop-blur-sm">
            {viewConfig?.icon} {viewConfig?.label}
          </div>
        </div>
      )}

      {/* Step 3: Photo Review */}
      {capturedPhoto && (
        <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
          <img 
            src={capturedPhoto} 
            alt="Captured hoof" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Review Controls */}
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

          {/* View indicator */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium backdrop-blur-sm">
            {viewConfig?.icon} {viewConfig?.label}
          </div>
        </div>
      )}
    </div>
  );
}
