import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bug, X, Pencil, Undo2, Send, Loader2, Video, Camera, Square, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface FeedbackWidgetProps {
  className?: string;
}

// Global console log capture
const consoleLogs: Array<{type: string; message: string; timestamp: string}> = [];
const MAX_LOGS = 50;

// Override console methods to capture logs
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

if (typeof window !== 'undefined' && !(window as any).__feedbackConsolePatched) {
  (window as any).__feedbackConsolePatched = true;
  
  ['log', 'error', 'warn'].forEach((type) => {
    (console as any)[type] = (...args: any[]) => {
      consoleLogs.push({
        type,
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        timestamp: new Date().toISOString()
      });
      if (consoleLogs.length > MAX_LOGS) consoleLogs.shift();
      (originalConsole as any)[type](...args);
    };
  });
}

export function FeedbackWidget({ className }: FeedbackWidgetProps) {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "capturing" | "annotating" | "form" | "recording">("idle");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  const captureScreenshot = useCallback(async () => {
    try {
      // Hide the FAB button
      const widgetButton = document.querySelector('[data-feedback-widget]');
      if (widgetButton) (widgetButton as HTMLElement).style.visibility = 'hidden';
      
      // Hide any Radix dialog overlays (portals render at body level)
      const overlays = document.querySelectorAll('[data-radix-portal], [role="dialog"], .fixed.inset-0');
      overlays.forEach(el => {
        (el as HTMLElement).style.visibility = 'hidden';
      });
      
      // Wait for React to update and dialogs to be fully hidden
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: Math.min(window.devicePixelRatio || 1, 2), // Cap scale for performance
        logging: false,
        backgroundColor: null,
        removeContainer: true,
        ignoreElements: (element) => {
          // Ignore feedback-related elements and dialog portals
          if (element.hasAttribute('data-feedback-widget')) return true;
          if (element.hasAttribute('data-radix-portal')) return true;
          if (element.getAttribute('role') === 'dialog') return true;
          if (element.classList.contains('feedback-dialog')) return true;
          return false;
        }
      });
      
      // Restore visibility
      if (widgetButton) (widgetButton as HTMLElement).style.visibility = '';
      overlays.forEach(el => {
        (el as HTMLElement).style.visibility = '';
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Empty screenshot');
      }
      
      setScreenshot(dataUrl);
      setStep("annotating");
      setIsOpen(true);
    } catch (error) {
      console.error("Screenshot failed:", error);
      toast.error("Screenshot konnte nicht erstellt werden");
      setStep("idle");
      setIsOpen(true);
      
      // Restore visibility on error
      const widgetButton = document.querySelector('[data-feedback-widget]');
      if (widgetButton) (widgetButton as HTMLElement).style.visibility = '';
      const overlays = document.querySelectorAll('[data-radix-portal], [role="dialog"], .fixed.inset-0');
      overlays.forEach(el => {
        (el as HTMLElement).style.visibility = '';
      });
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsOpen(false);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: "browser",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9' 
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setStep("form");
        setIsOpen(true);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
      
      // Stop when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.info("Aufnahme gestartet - Zeige den Fehler und beende dann die Bildschirmfreigabe");
      
    } catch (error) {
      console.error("Recording failed:", error);
      toast.error("Screen Recording nicht verfügbar");
      setIsOpen(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Initialize canvas when screenshot is ready
  useEffect(() => {
    if (step === "annotating" && screenshot && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Scale canvas to fit in dialog
        const maxWidth = Math.min(800, window.innerWidth - 80);
        const maxHeight = Math.min(500, window.innerHeight - 300);
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setDrawHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      };
      img.src = screenshot;
    }
  }, [step, screenshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        setDrawHistory(prev => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
      }
    }
    setIsDrawing(false);
  };

  const undoLast = () => {
    if (drawHistory.length > 1 && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const newHistory = drawHistory.slice(0, -1);
        ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
        setDrawHistory(newHistory);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Bitte beschreibe das Problem");
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl = null;
      let videoUrl = null;
      const timestamp = Date.now();
      const userId = user?.id || 'anonymous';

      // Upload screenshot if available
      if (canvasRef.current && step !== "recording") {
        const annotatedScreenshot = canvasRef.current.toDataURL('image/png');
        
        const fileName = `feedback/${timestamp}_${userId}.png`;
        const base64Data = annotatedScreenshot.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(uploadData.path);
          screenshotUrl = publicUrl;
        }
      }

      // Upload video if available
      if (recordedBlob) {
        const videoFileName = `feedback/${timestamp}_${userId}.webm`;
        
        const { data: videoUploadData, error: videoUploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(videoFileName, recordedBlob, { contentType: 'video/webm' });

        if (!videoUploadError && videoUploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(videoUploadData.path);
          videoUrl = publicUrl;
        }
      }

      // Get browser info with console logs
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        consoleLogs: consoleLogs.slice(-20), // Last 20 logs
        performance: {
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          } : null,
          timing: performance.timing ? {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          } : null
        },
        videoUrl: videoUrl
      };

      // Insert feedback report
      const { error } = await supabase.from('feedback_reports').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_role: role || null,
        page_url: window.location.href,
        description: description.trim(),
        screenshot_url: screenshotUrl || videoUrl,
        browser_info: JSON.stringify(browserInfo),
        status: 'open'
      });

      if (error) throw error;

      toast.success("Feedback gesendet! Danke für deine Meldung.");
      handleClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Fehler beim Senden des Feedbacks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("idle");
    setScreenshot(null);
    setDescription("");
    setDrawHistory([]);
    setRecordedBlob(null);
    setRecordingTime(0);
  };

  const startCapture = () => {
    // Close dialog first, then capture after it's fully unmounted
    setIsOpen(false);
    setStep("capturing");
    
    // Wait for dialog animation to complete and DOM to update
    setTimeout(() => {
      captureScreenshot();
    }, 350);
  };

  // Show recording indicator when recording
  if (isRecording) {
    return (
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg z-[100] flex items-center gap-3"
      >
        <Circle className="h-3 w-3 fill-current animate-pulse" />
        <span className="font-medium">Aufnahme läuft: {formatTime(recordingTime)}</span>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={stopRecording}
          className="h-7 px-2"
        >
          <Square className="h-3 w-3 mr-1" />
          Stoppen
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      <Button
        data-feedback-widget
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-40 bg-destructive hover:bg-destructive/90 ${className}`}
        size="icon"
        title="Problem melden"
      >
        <Bug className="h-5 w-5" />
      </Button>

      {/* Initial Dialog */}
      <Dialog open={isOpen && step === "idle"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md feedback-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Problem melden
            </DialogTitle>
            <DialogDescription>
              Erstelle einen Screenshot oder nimm ein Video auf, um das Problem zu zeigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button onClick={startCapture} variant="outline" className="w-full gap-2 h-14">
              <Camera className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Screenshot</div>
                <div className="text-xs text-muted-foreground">Markiere den Fehler auf dem Bild</div>
              </div>
            </Button>
            
            <Button onClick={startRecording} variant="outline" className="w-full gap-2 h-14">
              <Video className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <div className="font-medium">Screen Recording</div>
                <div className="text-xs text-muted-foreground">Zeige den Fehler in Aktion</div>
              </div>
            </Button>
            
            <p className="text-xs text-muted-foreground text-center pt-2">
              Console-Logs und Browser-Info werden automatisch erfasst.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Indicator (non-modal, hidden from screenshot) */}
      {step === "capturing" && (
        <div 
          data-feedback-widget
          className="fixed inset-0 bg-background/50 z-[100] flex items-center justify-center"
          style={{ visibility: 'hidden' }}
        >
          <div className="bg-card p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Screenshot wird erstellt...</p>
          </div>
        </div>
      )}

      {/* Annotation Dialog */}
      <Dialog open={step === "annotating"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4 feedback-dialog">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Problem markieren
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLast}
                  disabled={drawHistory.length <= 1}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Zeichne auf dem Screenshot, um das Problem zu markieren
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-auto flex justify-center">
            <canvas
              ref={canvasRef}
              className="border rounded-lg cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={() => setStep("form")} className="flex-1">
              Weiter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Description Form Dialog */}
      <Dialog open={step === "form"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg feedback-dialog">
          <DialogHeader>
            <DialogTitle>Was funktioniert nicht?</DialogTitle>
            <DialogDescription>
              Beschreibe kurz das Problem
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Show screenshot preview */}
            {canvasRef.current && !recordedBlob && (
              <div className="overflow-auto max-h-48 border rounded-lg">
                <img 
                  src={canvasRef.current.toDataURL()} 
                  alt="Screenshot" 
                  className="w-full"
                />
              </div>
            )}
            
            {/* Show video preview */}
            {recordedBlob && (
              <div className="overflow-auto max-h-48 border rounded-lg bg-black">
                <video 
                  src={URL.createObjectURL(recordedBlob)} 
                  controls
                  className="w-full max-h-48"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung *</Label>
              <Textarea
                id="description"
                placeholder="Was hast du versucht zu tun? Was ist stattdessen passiert?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>📍 {window.location.pathname}</span>
              <span>•</span>
              <span>🔧 {consoleLogs.length} Console-Logs erfasst</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => recordedBlob ? handleClose() : setStep("annotating")}>
              Zurück
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !description.trim()}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Absenden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
