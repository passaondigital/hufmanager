import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Check, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  initialSignature?: string | null;
  disabled?: boolean;
}

export function SignaturePad({ 
  onSignatureChange, 
  initialSignature,
  disabled = false 
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasSigned, setHasSigned] = useState(false);

  // Set initial signature if provided
  useEffect(() => {
    if (initialSignature && sigCanvas.current) {
      // Load initial signature
      const img = new Image();
      img.onload = () => {
        const canvas = sigCanvas.current?.getCanvas();
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            setIsEmpty(false);
            setHasSigned(true);
          }
        }
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setHasSigned(false);
    onSignatureChange(null);
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL("image/png");
      onSignatureChange(dataUrl);
      setHasSigned(true);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <PenTool className="h-4 w-4" />
          Abnahme & Unterschrift
        </Label>
        {hasSigned && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Unterschrieben
          </span>
        )}
      </div>

      {/* Signature Canvas Container */}
      <div 
        ref={containerRef}
        className={cn(
          "relative border-2 border-dashed rounded-lg bg-background transition-colors",
          isEmpty && !hasSigned ? "border-muted-foreground/30" : "border-[#F47B20]/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Display saved signature or canvas */}
        {hasSigned && initialSignature ? (
          <div className="w-full h-32 flex items-center justify-center">
            <img 
              src={initialSignature} 
              alt="Unterschrift" 
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="#111827"
              canvasProps={{
                className: "w-full h-32 touch-none",
                style: { 
                  width: "100%", 
                  height: "128px",
                  touchAction: "none"
                }
              }}
              onEnd={handleEnd}
            />
            
            {/* Hint text when empty */}
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-muted-foreground/50">
                  Hier unterschreiben
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || (isEmpty && !hasSigned)}
          className="flex-1"
        >
          <Eraser className="h-4 w-4 mr-2" />
          Löschen
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={disabled || isEmpty || hasSigned}
          className="flex-1 bg-[#F47B20] hover:bg-[#F47B20]/90 text-white"
        >
          <Check className="h-4 w-4 mr-2" />
          Unterschrift speichern
        </Button>
      </div>

      {/* Legal Disclaimer */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Hiermit bestätige ich die ordnungsgemäße Durchführung der Arbeiten.
      </p>
    </div>
  );
}
