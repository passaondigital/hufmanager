import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";
import { HoofViewSelector } from "./HoofViewSelector";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, getStorageUrl } from "@/lib/storage";
import { toast } from "sonner";

// Low-light helpers and torch control will be handled in this component


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
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null); // e.g. 'vl','vr','hl','hr'

  // Torch & Low-light detection
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lowLightDetected, setLowLightDetected] = useState(false);
  const brightnessSamplerRef = useRef<number | null>(null);
  
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

        // Check for torch support on the active video track
        try {
          const track = stream.getVideoTracks()[0];
          const caps = (track as any).getCapabilities?.();
          if (caps && typeof caps.torch !== 'undefined') {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
          }
        } catch (err) {
          setTorchSupported(false);
        }

        // Start brightness sampling for low-light detection
        if (!brightnessSamplerRef.current) {
          brightnessSamplerRef.current = window.setInterval(() => {
            if (!videoRef.current) return;
            try {
              const w = 64, h = 48;
              const c = document.createElement('canvas');
              c.width = w; c.height = h;
              const ctx = c.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(videoRef.current!, 0, 0, w, h);
              const data = ctx.getImageData(0, 0, w, h).data;
              let sum = 0;
              for (let i = 0; i < data.length; i += 4) {
                // luminance
                const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                sum += lum;
              }
              const avg = sum / (w * h);
              setLowLightDetected(avg < 60); // threshold
            } catch (e) {
              // ignore sampling errors
            }
          }, 900);
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
      // switch off torch if it was left on
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track && torchOn) {
          track.applyConstraints?.({ advanced: [{ torch: false }] });
          setTorchOn(false);
        }
      } catch (e) {}

      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop brightness sampling
    if (brightnessSamplerRef.current) {
      clearInterval(brightnessSamplerRef.current);
      brightnessSamplerRef.current = null;
      setLowLightDetected(false);
    }

    setIsCameraActive(false);
  }, []);

  // Trigger file input so mobile camera UI or file picker opens.
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Toggle the device torch if supported
  const toggleTorch = useCallback(async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const caps = (track as any).getCapabilities?.();
      if (!caps || typeof caps.torch === 'undefined') {
        setTorchSupported(false);
        toast.info('Taschenlampe wird von diesem Gerät nicht unterstützt');
        return;
      }

      await track.applyConstraints?.({ advanced: [{ torch: !torchOn }] });
      setTorchOn(prev => !prev);
    } catch (err) {
      console.error('Torch toggle failed', err);
      toast.error('Taschenlampe konnte nicht geschaltet werden');
    }
  }, [torchOn]);

  // Simple client-side enhancer for low-light images (brightness/contrast)
  const enhanceImage = useCallback(async (file: File): Promise<Blob> => {
    // Load image
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const url = URL.createObjectURL(file);
      const i = new Image();
      i.onload = () => {
        URL.revokeObjectURL(url);
        res(i);
      };
      i.onerror = rej;
      i.src = url;
    });

    // Scale down if very large for performance
    const max = 2048;
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, w, h);

    // Basic brightness/contrast manipulation on pixel data
    try {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const brightness = 12; // add up to +12
      const contrast = 1.08; // slight contrast
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = data[i + c];
          v = v + brightness;
          v = factor * (v - 128) + 128;
          data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
      // if getImageData is blocked by CORS or other issues, fall back to small CSS filter draw
      ctx.filter = 'brightness(1.12) contrast(1.06)';
      ctx.drawImage(img, 0, 0, w, h);
    }

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as any, 'image/jpeg', 0.9));
    if (!blob) return file;
    return blob;
  }, []);

  // Helper: create collage if needed after upload
  const createCollageIfNeeded = useCallback(async (horseId: string, position: string) => {
    try {
      // Count photos for this horse + position (exclude collages)
      const { data: photos = [] } = await supabase
        .from('hoof_photos')
        .select('*')
        .eq('horse_id', horseId)
        .eq('hoof_position', position)
        .not('notes', 'eq', 'collage')
        .order('created_at', { ascending: false });

      if (photos.length === 0) return;

      if (photos.length % 4 !== 0) return; // only create when multiple of 4

      // Get latest 4 photos
      const latest4 = photos.slice(0, 4);

      // Get signed URLs for each file path
      const signedUrls = await Promise.all(
        latest4.map(async (p: any) => {
          return await getStorageUrl('hoof_photos', p.file_path || p.photo_url);
        })
      );

      // Load images via fetch -> blob -> objectURL to avoid CORS issues on mobile
      const loadImageFromUrl = async (src: string) => {
        try {
          const res = await fetch(src, { mode: 'cors' });
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const img = await new Promise<HTMLImageElement>((resImg, rejImg) => {
            const i = new Image();
            i.onload = () => resImg(i);
            i.onerror = rejImg;
            i.src = objUrl;
          });
          // revoke object URL after loading
          URL.revokeObjectURL(objUrl);
          return img;
        } catch (err) {
          console.error('Failed to load image for collage via fetch:', err);
          throw err;
        }
      };

      const images = await Promise.all(signedUrls.map(s => loadImageFromUrl(s as string)));

      const size = 2048;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw 2x2 grid
      const half = size / 2;
      for (let i = 0; i < 4; i++) {
        const img = images[i];
        const x = (i % 2) * half;
        const y = Math.floor(i / 2) * half;
        // cover strategy
        const ratio = Math.max(half / img.width, half / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const dx = x + (half - w) / 2;
        const dy = y + (half - h) / 2;
        ctx.drawImage(img, dx, dy, w, h);
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as any, 'image/jpeg', 0.9));
      if (!blob) return;

      const filename = `collage_${horseId}_${position}_${Date.now()}.jpg`;
      const path = `hoof_photos/collages/${filename}`;

      const { path: uploadedPath, error: uploadErr } = await uploadFile('hoof_photos', path, blob, { upsert: true });
      if (uploadErr || !uploadedPath) {
        console.error('Collage upload failed', uploadErr);
        return;
      }

      const { data: urlData } = supabase.storage.from('hoof_photos').getPublicUrl(uploadedPath);
      const publicUrl = urlData.publicUrl;

      // Insert collage record
      const { error: dbErr } = await supabase.from('hoof_photos').insert({
        horse_id: horseId,
        photo_url: publicUrl,
        file_path: uploadedPath,
        hoof_position: position,
        notes: 'collage',
        taken_at: new Date().toISOString(),
      });

      if (dbErr) {
        console.error('Saving collage record failed', dbErr);
      } else {
        toast.success('Collage erstellt');
      }
    } catch (err) {
      console.error('Collage creation failed', err);
      toast.error('Collage konnte nicht erstellt werden (siehe Konsole)');
    }
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

      // If low light detected, run a quick enhancement step before upload
      let uploadFileObj: File | Blob = file;
      if (lowLightDetected) {
        try {
          uploadFileObj = await enhanceImage(file);
          toast.info('Foto leicht verbessert für besseres Ergebnis');
        } catch (e) {
          // continue with original
        }
      }

      // Upload to supabase storage (bucket: hoof_photos)
      const { path: uploadedPath, error: uploadErr } = await uploadFile('hoof_photos', path, uploadFileObj, { upsert: true });
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
      const insertPayload: any = {
        photo_url: publicUrl,
        file_path: uploadedPath,
      };
      if (horseId) insertPayload.horse_id = horseId;
      if (selectedPosition) insertPayload.hoof_position = selectedPosition;
      if (selectedView) insertPayload.view_angle = selectedView;

      if (horseId) {
        const { error: dbError } = await supabase.from('hoof_photos').insert(insertPayload);

        if (dbError) {
          console.error('DB insert failed', dbError);
          toast.error('Foto konnte nicht in DB gespeichert werden');
          // still call onPhotoCapture with the public URL so the UI remains responsive
        } else {
          // If we have horse & position, check for collage creation
          if (horseId && selectedPosition) {
            // run in background (don't await)
            createCollageIfNeeded(horseId, selectedPosition);
          }
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
  }, [onPhotoCapture, selectedView, stopCamera, horseId, selectedPosition, createCollageIfNeeded]);

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
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={resetToViewSelection}
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="flex gap-1 bg-black/20 p-1 rounded-md items-center">
                <button
                  className={cn("px-2 py-1 rounded text-xs font-medium", selectedPosition === 'vl' ? 'bg-primary text-white' : 'bg-transparent')}
                  onClick={() => setSelectedPosition('vl')}
                >VL</button>
                <button
                  className={cn("px-2 py-1 rounded text-xs font-medium", selectedPosition === 'vr' ? 'bg-primary text-white' : 'bg-transparent')}
                  onClick={() => setSelectedPosition('vr')}
                >VR</button>
                <button
                  className={cn("px-2 py-1 rounded text-xs font-medium", selectedPosition === 'hl' ? 'bg-primary text-white' : 'bg-transparent')}
                  onClick={() => setSelectedPosition('hl')}
                >HL</button>
                <button
                  className={cn("px-2 py-1 rounded text-xs font-medium", selectedPosition === 'hr' ? 'bg-primary text-white' : 'bg-transparent')}
                  onClick={() => setSelectedPosition('hr')}
                >HR</button>

                {/* Torch toggle */}
                <button
                  onClick={toggleTorch}
                  disabled={!torchSupported}
                  className={cn(
                    "ml-2 p-2 rounded text-sm transition",
                    torchOn ? 'bg-primary text-white' : 'bg-transparent',
                    !torchSupported && 'opacity-40'
                  )}
                  title={torchSupported ? (torchOn ? 'Taschenlampe aus' : 'Taschenlampe an') : 'Taschenlampe nicht unterstützt'}
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
                onClick={triggerFileInput}
              >
                <Camera className="h-7 w-7" />
              </Button>
              <div className="w-12" /> {/* Spacer for alignment */}
            </div>
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
