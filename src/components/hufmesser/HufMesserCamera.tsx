import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera, X, RotateCcw, ZoomIn, Ruler, FlashlightOff, Flashlight,
  Move
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HufMesserCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
  hoofLabel: string;
}

export function HufMesserCamera({ onCapture, onCancel, hoofLabel }: HufMesserCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
        };
      }

      // Check flash capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities && "torch" in capabilities) {
        setHasFlash(true);
      }
    } catch (err) {
      console.error("Kamera-Fehler:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsReady(false);
  }, [stream]);

  const toggleFlash = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any],
      });
      setFlashOn(!flashOn);
    } catch (err) {
      console.error("Flash-Fehler:", err);
    }
  }, [stream, flashOn]);

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

    stopCamera();
    onCapture(dataUrl);
  }, [stopCamera, onCapture]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onCancel(); }} className="text-white">
            <X className="h-6 w-6" />
          </Button>
          <div className="text-white text-center">
            <p className="font-bold text-lg">HufMesser</p>
            <p className="text-sm text-white/80">{hoofLabel} - Sohle fotografieren</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Camera View with Guide Overlay */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Measurement Guide Overlay */}
        {isReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Center circle guide */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-72 h-80">
                {/* Hoof outline guide */}
                <svg viewBox="0 0 200 240" className="w-full h-full">
                  {/* Outer guide ring */}
                  <ellipse
                    cx="100"
                    cy="130"
                    rx="80"
                    ry="95"
                    fill="none"
                    stroke="rgba(0,255,0,0.5)"
                    strokeWidth="2"
                    strokeDasharray="8 4"
                  />
                  {/* Vertical line (Länge) */}
                  <line
                    x1="100" y1="35"
                    x2="100" y2="225"
                    stroke="rgba(0,120,255,0.8)"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                  />
                  {/* Horizontal line (Breite) */}
                  <line
                    x1="20" y1="140"
                    x2="180" y2="140"
                    stroke="rgba(0,255,0,0.8)"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                  />
                  {/* Labels */}
                  <text x="106" y="130" fill="rgba(0,120,255,0.9)" fontSize="12" fontWeight="bold">
                    Länge
                  </text>
                  <text x="25" y="135" fill="rgba(0,255,0,0.9)" fontSize="12" fontWeight="bold">
                    Breite
                  </text>
                  {/* Arrow tips for Länge */}
                  <polygon points="97,40 103,40 100,30" fill="rgba(0,120,255,0.8)" />
                  <polygon points="97,220 103,220 100,230" fill="rgba(0,120,255,0.8)" />
                  {/* Arrow tips for Breite */}
                  <polygon points="25,137 25,143 15,140" fill="rgba(0,255,0,0.8)" />
                  <polygon points="175,137 175,143 185,140" fill="rgba(0,255,0,0.8)" />
                </svg>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-28 left-0 right-0 text-center">
              <div className="bg-black/60 backdrop-blur-sm mx-auto w-fit px-4 py-2 rounded-full">
                <p className="text-white text-sm">
                  Huf-Sohle in den Rahmen positionieren
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
        <div className="flex items-center justify-around">
          {hasFlash && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFlash}
              className="text-white h-12 w-12"
            >
              {flashOn ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
            </Button>
          )}
          {!hasFlash && <div className="w-12" />}

          {/* Capture Button */}
          <button
            onClick={capturePhoto}
            disabled={!isReady}
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
              isReady
                ? "bg-white/20 hover:bg-white/30 active:scale-95"
                : "bg-white/10 opacity-50"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>

          <div className="w-12" />
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
