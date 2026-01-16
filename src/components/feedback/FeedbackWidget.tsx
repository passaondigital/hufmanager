import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bug, X, Pencil, Undo2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface FeedbackWidgetProps {
  className?: string;
}

export function FeedbackWidget({ className }: FeedbackWidgetProps) {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "capturing" | "annotating" | "form">("idle");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  const captureScreenshot = useCallback(async () => {
    setStep("capturing");
    
    try {
      // Hide our widget first
      const widgetButton = document.querySelector('[data-feedback-widget]');
      if (widgetButton) (widgetButton as HTMLElement).style.display = 'none';
      
      // Small delay for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: window.devicePixelRatio || 1,
        logging: false,
        ignoreElements: (element) => {
          return element.hasAttribute('data-feedback-widget') || 
                 element.classList.contains('feedback-dialog');
        }
      });
      
      // Show widget again
      if (widgetButton) (widgetButton as HTMLElement).style.display = '';
      
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      setStep("annotating");
    } catch (error) {
      console.error("Screenshot failed:", error);
      toast.error("Screenshot konnte nicht erstellt werden");
      setStep("idle");
      
      // Show widget again on error
      const widgetButton = document.querySelector('[data-feedback-widget]');
      if (widgetButton) (widgetButton as HTMLElement).style.display = '';
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

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Bitte beschreibe das Problem");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get annotated screenshot
      let screenshotUrl = null;
      if (canvasRef.current) {
        const annotatedScreenshot = canvasRef.current.toDataURL('image/png');
        
        // Upload to Supabase Storage
        const fileName = `feedback/${Date.now()}_${user?.id || 'anonymous'}.png`;
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

      // Get browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
      };

      // Insert feedback report
      const { error } = await supabase.from('feedback_reports').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_role: role || null,
        page_url: window.location.href,
        description: description.trim(),
        screenshot_url: screenshotUrl,
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
  };

  const startCapture = () => {
    setIsOpen(false);
    // Brief delay to let dialog close
    setTimeout(() => {
      captureScreenshot();
    }, 100);
  };

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
              Erstelle einen Screenshot und markiere genau, was nicht funktioniert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button onClick={startCapture} className="w-full gap-2">
              <Pencil className="h-4 w-4" />
              Screenshot erstellen & markieren
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Nach dem Screenshot kannst du mit dem Finger oder der Maus das Problem markieren.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Dialog */}
      <Dialog open={step === "capturing"}>
        <DialogContent className="sm:max-w-sm feedback-dialog">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Screenshot wird erstellt...</p>
          </div>
        </DialogContent>
      </Dialog>

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
            {canvasRef.current && (
              <div className="overflow-auto max-h-48 border rounded-lg">
                <img 
                  src={canvasRef.current.toDataURL()} 
                  alt="Screenshot" 
                  className="w-full"
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

            <p className="text-xs text-muted-foreground">
              Seite: {window.location.pathname}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("annotating")}>
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
