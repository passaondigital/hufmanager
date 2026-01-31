import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";

interface HufCamLiteCaptureProps {
  onPhotoCapture: (dataUrl: string, view: HoofView) => void;
  onCancel?: () => void;
  className?: string;
}

export function HufCamLiteCapture({ 
  onPhotoCapture, 
  onCancel,
  className 
}: HufCamLiteCaptureProps) {
  const [selectedView, setSelectedView] = useState<HoofView | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      // Request orientation permission on iOS
      if (isOrientationSupported && !hasOrientationPermission) {
        await requestOrientationPermission();
      }

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
  }, [isOrientationSupported, hasOrientationPermission, requestOrientationPermission]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
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

  // Confirm captured photo
  const confirmPhoto = useCallback(() => {
    if (capturedPhoto && selectedView) {
      onPhotoCapture(capturedPhoto, selectedView);
      setCapturedPhoto(null);
      setSelectedView(null);
    }
  }, [capturedPhoto, selectedView, onPhotoCapture]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

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
          
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

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
              onClick={capturePhoto}
              disabled={!isCameraActive}
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
