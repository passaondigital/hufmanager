import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, Video, ChevronRight, ChevronLeft, Check, AlertTriangle } from "lucide-react";

interface AppointmentCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  horseName: string;
  clientName: string;
  onCompleted: () => void;
}

type Step = 'documentation' | 'acceptance' | 'signature';

export function AppointmentCompletionDialog({
  open,
  onClose,
  appointmentId,
  horseName,
  clientName,
  onCompleted,
}: AppointmentCompletionDialogProps) {
  const [step, setStep] = useState<Step>('documentation');
  const [saving, setSaving] = useState(false);
  
  // Documentation
  const [completionNotes, setCompletionNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Acceptance
  const [gaitAnalysisDone, setGaitAnalysisDone] = useState(false);
  const [gaitAnalysisOk, setGaitAnalysisOk] = useState(false);
  const [gaitVideoUrl, setGaitVideoUrl] = useState('');
  
  // Signature
  const [signedByName, setSignedByName] = useState(clientName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep('documentation');
      setCompletionNotes('');
      setPhotoUrls([]);
      setGaitAnalysisDone(false);
      setGaitAnalysisOk(false);
      setGaitVideoUrl('');
      setSignedByName(clientName);
      setHasSignature(false);
    }
  }, [open, clientName]);

  // Initialize canvas
  useEffect(() => {
    if (step === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [step]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${appointmentId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('hoof_photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('hoof_photos')
          .getPublicUrl(fileName);

        setPhotoUrls(prev => [...prev, urlData.publicUrl]);
      }
    } catch (error: any) {
      toast({
        title: "Fehler beim Hochladen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Canvas drawing handlers
  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleComplete = async () => {
    if (!hasSignature || !signedByName.trim()) {
      toast({
        title: "Unterschrift erforderlich",
        description: "Bitte Name eingeben und unterschreiben lassen.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Upload signature
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas nicht gefunden");
      
      const signatureBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Signatur konnte nicht erstellt werden"));
        }, 'image/png');
      });

      const signatureFileName = `${appointmentId}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (uploadError) throw uploadError;

      const { data: signatureUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(signatureFileName);

      // Update appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completion_notes: completionNotes,
          gait_analysis_done: gaitAnalysisDone,
          gait_analysis_ok: gaitAnalysisOk,
          gait_video_url: gaitVideoUrl || null,
          signature_url: signatureUrlData.publicUrl,
          signed_at: new Date().toISOString(),
          signed_by_name: signedByName.trim(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Generate PDF report
      try {
        await supabase.functions.invoke('generate-completion-report', {
          body: { appointmentId },
        });
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        // Don't block completion if PDF fails
      }

      toast({ title: "Termin erfolgreich abgeschlossen" });
      onCompleted();
      onClose();
    } catch (error: any) {
      toast({
        title: "Fehler beim Abschließen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'documentation', label: 'Dokumentation' },
    { key: 'acceptance', label: 'Abnahme' },
    { key: 'signature', label: 'Unterschrift' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Termin abschließen</DialogTitle>
          <DialogDescription>
            {horseName} • Werkvertrag-Abnahme
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-3 border-b">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${i < currentStepIndex ? 'bg-primary text-primary-foreground' : ''}
                ${i === currentStepIndex ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}
                ${i > currentStepIndex ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {step === 'documentation' && (
            <>
              <div>
                <Label>Was wurde gemacht?</Label>
                <Textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Beschreibung der durchgeführten Arbeiten..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotos hochladen
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      Fotos auswählen
                    </span>
                  </Button>
                </label>
                {photoUrls.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {photoUrls.map((url, i) => (
                      <img 
                        key={i} 
                        src={url} 
                        alt={`Foto ${i + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'acceptance' && (
            <>
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Werkvertragliche Abnahme</p>
                    <p className="text-amber-700 mt-1">
                      Die Ganganalyse nach der Bearbeitung ist rechtlich wichtig. 
                      Sie dokumentiert, dass das Pferd mangelfrei läuft.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="gait-done"
                  checked={gaitAnalysisDone}
                  onCheckedChange={(checked) => setGaitAnalysisDone(checked as boolean)}
                />
                <div>
                  <Label htmlFor="gait-done" className="cursor-pointer">
                    Ganganalyse nach Bearbeitung durchgeführt
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Das Pferd wurde im Schritt und/oder Trab vorgeführt
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="gait-ok"
                  checked={gaitAnalysisOk}
                  onCheckedChange={(checked) => setGaitAnalysisOk(checked as boolean)}
                  disabled={!gaitAnalysisDone}
                />
                <div>
                  <Label htmlFor="gait-ok" className={`cursor-pointer ${!gaitAnalysisDone ? 'opacity-50' : ''}`}>
                    Pferd läuft mangelfrei / unverändert gut
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Keine Taktunreinheiten oder Auffälligkeiten beobachtet
                  </p>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Laufbild-Video (optional)
                </Label>
                <Input
                  value={gaitVideoUrl}
                  onChange={(e) => setGaitVideoUrl(e.target.value)}
                  placeholder="YouTube/Vimeo Link oder Dateipfad"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {step === 'signature' && (
            <>
              <div>
                <Label>Name des Unterzeichners</Label>
                <Input
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Unterschrift</Label>
                <div className="mt-1 border rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    className="w-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSignature}
                  className="mt-1"
                >
                  Löschen & neu unterschreiben
                </Button>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Rechtlicher Hinweis</p>
                <p>
                  Mit meiner Unterschrift nehme ich die durchgeführte Hufbearbeitung 
                  als vertragsgemäß ab (§ 640 BGB - Werkvertrag). Das Pferd wurde mir 
                  nach der Bearbeitung vorgeführt und ich bestätige den mangelfreien Zustand.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'documentation') {
                onClose();
              } else if (step === 'acceptance') {
                setStep('documentation');
              } else {
                setStep('acceptance');
              }
            }}
            disabled={saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 'documentation' ? 'Abbrechen' : 'Zurück'}
          </Button>

          {step !== 'signature' ? (
            <Button
              onClick={() => {
                if (step === 'documentation') {
                  setStep('acceptance');
                } else {
                  setStep('signature');
                }
              }}
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving || !hasSignature}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Abschließen & Senden
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
