import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HMCamCapture } from "./HMCamCapture";
import { HoofView } from "./types";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface CapturedPhoto {
  view: HoofView;
  dataUrl: string;
}

interface HMCamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (photos: CapturedPhoto[]) => void;
  mode?: "client" | "provider";
}

export function HMCamModal({ open, onOpenChange, onComplete, mode = "client" }: HMCamModalProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const handlePhotoCapture = useCallback((dataUrl: string, view: HoofView) => {
    setCapturedPhotos(prev => [...prev, { view, dataUrl }]);
    toast.success(`${view} Foto aufgenommen!`);
  }, []);

  const handleComplete = () => {
    onComplete?.(capturedPhotos);
    onOpenChange(false);
    if (capturedPhotos.length > 0) {
      toast.success(`${capturedPhotos.length} Foto${capturedPhotos.length > 1 ? "s" : ""} gespeichert!`);
    }
    // Reset state
    setCapturedPhotos([]);
    setShowSummary(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setCapturedPhotos([]);
    setShowSummary(false);
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh]">
        <div className="p-4 sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-primary font-bold">HM-CAM</span>
              <span className="text-xs font-normal text-muted-foreground">HufManager Cam</span>
            </DialogTitle>
          </DialogHeader>

          {/* Captured Photos Preview */}
          {capturedPhotos.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Aufgenommene Fotos ({capturedPhotos.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={photo.dataUrl} 
                      alt={`${photo.view} Ansicht`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5 capitalize">
                      {photo.view}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HM-CAM Capture Component */}
          <HMCamCapture
            onPhotoCapture={handlePhotoCapture}
            onCancel={handleClose}
          />

          {/* Action Buttons */}
          {capturedPhotos.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleComplete} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                {capturedPhotos.length} Foto{capturedPhotos.length > 1 ? "s" : ""} speichern
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
