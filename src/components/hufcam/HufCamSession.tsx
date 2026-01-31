import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ArrowUpFromLine,
  CircleDot,
  Footprints,
  Target,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Complete 5-view system per hoof as per documentation
const HOOF_POSITIONS = [
  { id: "VL", label: "VL", fullLabel: "Vorne Links" },
  { id: "VR", label: "VR", fullLabel: "Vorne Rechts" },
  { id: "HL", label: "HL", fullLabel: "Hinten Links" },
  { id: "HR", label: "HR", fullLabel: "Hinten Rechts" },
] as const;

const VIEW_ANGLES = [
  { id: "dorsal", label: "Dorsal", icon: Eye, description: "Ansicht von vorne", guide: "Fotografiere den Huf von vorne" },
  { id: "lateral", label: "Lateral", icon: Target, description: "Seitenansicht außen", guide: "Fotografiere die Außenseite" },
  { id: "medial", label: "Medial", icon: Target, description: "Seitenansicht innen", guide: "Fotografiere die Innenseite" },
  { id: "solar", label: "Solar", icon: Footprints, description: "Sohlenansicht", guide: "Fotografiere die Sohle von unten" },
  { id: "palmar", label: "Palmar/Plantar", icon: ArrowUpFromLine, description: "Ansicht von hinten", guide: "Fotografiere den Ballen von hinten" },
] as const;

type HoofPosition = typeof HOOF_POSITIONS[number]["id"];
type ViewAngle = typeof VIEW_ANGLES[number]["id"];

interface PhotoData {
  dataUrl: string;
  timestamp: Date;
  analysis?: {
    isAcceptable: boolean;
    score: number;
    feedback: string;
  };
}

interface HoofPhotos {
  [hoofId: string]: {
    [viewId: string]: PhotoData | null;
  };
}

interface HufCamSessionProps {
  horseName: string;
  horseId: string;
  horseBreed?: string;
  ownerName?: string;
  providerLogo?: string | null;
  onComplete: (photos: HoofPhotos, notes: string) => void;
  onCancel: () => void;
}

const STORAGE_KEY = "hufcam_session_progress";

export function HufCamSession({
  horseName,
  horseId,
  horseBreed,
  ownerName,
  providerLogo,
  onComplete,
  onCancel,
}: HufCamSessionProps) {
  const [currentHoofIndex, setCurrentHoofIndex] = useState(0);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [photos, setPhotos] = useState<HoofPhotos>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${horseId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore dates
        Object.values(parsed.photos || {}).forEach((hoof: any) => {
          Object.values(hoof || {}).forEach((photo: any) => {
            if (photo?.timestamp) {
              photo.timestamp = new Date(photo.timestamp);
            }
          });
        });
        return parsed.photos || initializePhotos();
      }
    } catch (e) {
      console.error("Failed to restore session:", e);
    }
    return initializePhotos();
  });
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureMode, setCaptureMode] = useState<"camera" | "upload">("camera");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentHoof = HOOF_POSITIONS[currentHoofIndex];
  const currentView = VIEW_ANGLES[currentViewIndex];
  const totalSteps = HOOF_POSITIONS.length * VIEW_ANGLES.length;
  const currentStep = currentHoofIndex * VIEW_ANGLES.length + currentViewIndex + 1;
  const progress = (currentStep / totalSteps) * 100;

  // Count completed photos
  const photoCount = Object.values(photos).reduce((count, hoof) => {
    return count + Object.values(hoof).filter(Boolean).length;
  }, 0);

  // Check if current hoof is complete
  const isCurrentHoofComplete = Object.values(photos[currentHoof.id] || {}).every(Boolean);

  function initializePhotos(): HoofPhotos {
    const initial: HoofPhotos = {};
    HOOF_POSITIONS.forEach(({ id }) => {
      initial[id] = {};
      VIEW_ANGLES.forEach(({ id: viewId }) => {
        initial[id][viewId] = null;
      });
    });
    return initial;
  }

  // Save progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${horseId}`, JSON.stringify({
        photos,
        notes,
        currentHoofIndex,
        currentViewIndex,
        savedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  }, [photos, notes, currentHoofIndex, currentViewIndex, horseId]);

  // Initialize camera - use ref to avoid re-renders causing flickering
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isStartingCamera = useRef(false);

  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous starts
    if (cameraStreamRef.current || isStartingCamera.current) return;
    isStartingCamera.current = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      // Double check we didn't already get a stream while waiting
      if (cameraStreamRef.current) {
        stream.getTracks().forEach(track => track.stop());
        isStartingCamera.current = false;
        return;
      }
      
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraReady(true);
            isStartingCamera.current = false;
          }).catch((err) => {
            console.error("Video play error:", err);
            isStartingCamera.current = false;
          });
        };
      } else {
        isStartingCamera.current = false;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Kamera nicht verfügbar. Nutze den Upload-Modus.");
      setCaptureMode("upload");
      isStartingCamera.current = false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      setIsCameraReady(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isStartingCamera.current = false;
  }, []);

  // Start camera only once when in camera mode - stable deps to prevent flickering
  useEffect(() => {
    if (captureMode === "camera") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      // Cleanup on unmount or mode change
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      isStartingCamera.current = false;
    };
  }, [captureMode, startCamera]);

  // Capture photo with burn-in metadata
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Burn-in metadata overlay
    const padding = 20;
    const fontSize = Math.max(16, Math.floor(canvas.width / 50));
    
    // Semi-transparent background strip at bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height - fontSize * 2.5, canvas.width, fontSize * 2.5);

    // Metadata text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "left";
    
    const dateStr = new Date().toLocaleDateString("de-DE");
    const timeStr = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const metaText = `${horseName} | ${currentHoof.id}-${currentView.id} | ${dateStr} ${timeStr}`;
    
    ctx.fillText(metaText, padding, canvas.height - fontSize * 0.8);

    // HufManager branding
    ctx.fillStyle = "#F47B20";
    ctx.textAlign = "right";
    ctx.fillText("HufManager", canvas.width - padding, canvas.height - fontSize * 0.8);

    // Get data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Analyze the image
    await analyzeAndSavePhoto(dataUrl);
  }, [isCameraReady, horseName, currentHoof, currentView]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await analyzeAndSavePhoto(dataUrl);
    };
    reader.onerror = () => toast.error("Fehler beim Laden des Bildes");
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Analyze photo with AI and save
  const analyzeAndSavePhoto = async (dataUrl: string) => {
    setIsAnalyzing(true);

    try {
      // Call AI analysis
      const { data, error } = await supabase.functions.invoke("analyze-hoof-image", {
        body: {
          imageBase64: dataUrl,
          hoofPosition: currentHoof.fullLabel,
          viewAngle: currentView.label,
          horseName,
        },
      });

      const analysis = error ? null : data;

      // Save photo
      const photoData: PhotoData = {
        dataUrl,
        timestamp: new Date(),
        analysis: analysis ? {
          isAcceptable: analysis.isAcceptable ?? true,
          score: analysis.score ?? 70,
          feedback: analysis.overallFeedback ?? "Foto gespeichert",
        } : undefined,
      };

      setPhotos((prev) => ({
        ...prev,
        [currentHoof.id]: {
          ...prev[currentHoof.id],
          [currentView.id]: photoData,
        },
      }));

      // Show feedback
      if (analysis) {
        if (analysis.isAcceptable) {
          toast.success("Foto aufgenommen!", {
            description: analysis.overallFeedback,
          });
        } else {
          toast.warning("Foto gespeichert", {
            description: analysis.overallFeedback,
          });
        }
      } else {
        toast.success("Foto aufgenommen");
      }

      // Auto-advance
      setTimeout(() => autoAdvance(), 300);
    } catch (err) {
      console.error("Analysis error:", err);
      // Save anyway without analysis
      setPhotos((prev) => ({
        ...prev,
        [currentHoof.id]: {
          ...prev[currentHoof.id],
          [currentView.id]: {
            dataUrl,
            timestamp: new Date(),
          },
        },
      }));
      toast.success("Foto aufgenommen");
      setTimeout(() => autoAdvance(), 300);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const autoAdvance = () => {
    if (currentViewIndex < VIEW_ANGLES.length - 1) {
      setCurrentViewIndex((prev) => prev + 1);
    } else if (currentHoofIndex < HOOF_POSITIONS.length - 1) {
      setCurrentHoofIndex((prev) => prev + 1);
      setCurrentViewIndex(0);
      toast.info(`Weiter zu: ${HOOF_POSITIONS[currentHoofIndex + 1].fullLabel}`);
    }
  };

  const goBack = () => {
    if (currentViewIndex > 0) {
      setCurrentViewIndex((prev) => prev - 1);
    } else if (currentHoofIndex > 0) {
      setCurrentHoofIndex((prev) => prev - 1);
      setCurrentViewIndex(VIEW_ANGLES.length - 1);
    }
  };

  const goNext = () => {
    if (currentViewIndex < VIEW_ANGLES.length - 1) {
      setCurrentViewIndex((prev) => prev + 1);
    } else if (currentHoofIndex < HOOF_POSITIONS.length - 1) {
      setCurrentHoofIndex((prev) => prev + 1);
      setCurrentViewIndex(0);
    }
  };

  const skipToHoof = (hoofIndex: number) => {
    setCurrentHoofIndex(hoofIndex);
    setCurrentViewIndex(0);
  };

  const removeCurrentPhoto = () => {
    setPhotos((prev) => ({
      ...prev,
      [currentHoof.id]: {
        ...prev[currentHoof.id],
        [currentView.id]: null,
      },
    }));
  };

  const handleComplete = () => {
    // Clear saved progress
    localStorage.removeItem(`${STORAGE_KEY}_${horseId}`);
    stopCamera();
    onComplete(photos, notes);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const currentPhoto = photos[currentHoof.id]?.[currentView.id];
  const ViewIcon = currentView.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold text-sm">🐴 {horseName}</h2>
              <p className="text-xs text-muted-foreground">
                {currentHoof.fullLabel} • {currentView.label}
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {photoCount}/{totalSteps}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Hoof Navigation Pills */}
        <div className="flex gap-1 mt-2">
          {HOOF_POSITIONS.map((hoof, idx) => {
            const hoofPhotoCount = Object.values(photos[hoof.id] || {}).filter(Boolean).length;
            const isComplete = hoofPhotoCount === VIEW_ANGLES.length;
            const isCurrent = idx === currentHoofIndex;

            return (
              <Button
                key={hoof.id}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 relative",
                  isComplete && !isCurrent && "bg-green-500/10 border-green-500/50"
                )}
                onClick={() => skipToHoof(idx)}
              >
                {hoof.label}
                {isComplete && (
                  <CheckCircle2 className="h-3 w-3 absolute -top-1 -right-1 text-green-500" />
                )}
                {hoofPhotoCount > 0 && !isComplete && (
                  <span className="text-[10px] ml-1">({hoofPhotoCount})</span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {currentPhoto ? (
          /* Photo Preview */
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <img
                src={currentPhoto.dataUrl}
                alt={`${currentHoof.id}-${currentView.id}`}
                className="w-full h-full object-contain bg-black"
              />
              
              {/* Analysis Badge */}
              {currentPhoto.analysis && (
                <div className={cn(
                  "absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-medium",
                  currentPhoto.analysis.isAcceptable
                    ? "bg-green-500/90 text-white"
                    : "bg-amber-500/90 text-white"
                )}>
                  {currentPhoto.analysis.isAcceptable ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4" /> {currentPhoto.analysis.score}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Prüfen
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-3 bg-card border-t border-border flex gap-2">
              <Button variant="outline" className="flex-1" onClick={removeCurrentPhoto}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Neu aufnehmen
              </Button>
              <Button className="flex-1" onClick={goNext}>
                Weiter
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : captureMode === "camera" ? (
          /* Camera View */
          <div className="h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Alignment Guide Overlay */}
            {showGuides && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-primary/50 rounded-lg" />
                </div>

                {/* Guide text */}
                <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                  <div className="bg-black/60 px-4 py-2 rounded-full">
                    <p className="text-white text-sm flex items-center gap-2">
                      <ViewIcon className="h-4 w-4" />
                      {currentView.guide}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white"
                  onClick={() => setShowGuides(!showGuides)}
                >
                  <Grid3X3 className={cn("h-6 w-6", showGuides && "text-primary")} />
                </Button>

                <Button
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  onClick={capturePhoto}
                  disabled={!isCameraReady || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white"
                  onClick={() => setCaptureMode("upload")}
                >
                  <ArrowUpFromLine className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload Mode */
          <div className="h-full flex flex-col items-center justify-center p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <ViewIcon className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{currentView.label}</h3>
                <p className="text-muted-foreground">{currentView.description}</p>
              </div>
              
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      Foto aufnehmen / hochladen
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCaptureMode("camera")}
                >
                  Live-Kamera nutzen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-card">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={currentHoofIndex === 0 && currentViewIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>

          {/* View Dots */}
          <div className="flex gap-1">
            {VIEW_ANGLES.map((view, idx) => {
              const hasPhoto = !!photos[currentHoof.id]?.[view.id];
              const isCurrent = idx === currentViewIndex;
              return (
                <button
                  key={view.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    isCurrent
                      ? "bg-primary"
                      : hasPhoto
                        ? "bg-green-500"
                        : "bg-muted"
                  )}
                  onClick={() => setCurrentViewIndex(idx)}
                />
              );
            })}
          </div>

          {photoCount >= 4 ? (
            <Button size="sm" onClick={handleComplete}>
              <Sparkles className="h-4 w-4 mr-1" />
              Fertig ({photoCount})
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={currentHoofIndex === HOOF_POSITIONS.length - 1 && currentViewIndex === VIEW_ANGLES.length - 1}
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
