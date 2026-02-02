import { useState, useRef, useEffect } from "react";
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
  
  // OPTION A vs B Schalter (Default: AUS für Stabilität)
  const [isAiEnabled, setIsAiEnabled] = useState(false); 
  
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Orientation (für Option A - Wasserwaage)
  const { tiltAngle, isLevel } = useDeviceOrientation();

  // --- KAMERA LOGIK ---
  const startCamera = async () => {
    try {
      // Alten Stream stoppen
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // KONFIGURATION JE NACH MODUS
      // Option B (Live): Simpelste Settings -> Kein Flackern
      // Option A (AI): Versucht höhere Auflösung für Details
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

      // Check ob Blitz verfügbar ist
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      // @ts-ignore
      setHasTorch(!!capabilities.torch);

    } catch (err) {
      console.error("Kamera Fehler:", err);
      toast.error("Kamera konnte nicht gestartet werden.");
    }
  };

  // Neustart bei Modus-Wechsel
  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [isAiEnabled, capturedPhoto]);

  // --- TOOLS ---
  const toggleTorch = async () => {
    if (!stream
