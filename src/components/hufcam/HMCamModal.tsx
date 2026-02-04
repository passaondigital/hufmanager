import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HMCamCapture } from "./HMCamCapture";
import { HoofView } from "./types";

interface HMCamModalProps {
  // Support both naming conventions
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  horseId?: string;
  horseName?: string;
  onPhotoCapture?: (url: string, view: HoofView) => void;
  onComplete?: (photos: { url: string; view: HoofView }[]) => void;
  mode?: "provider" | "client";
}

export function HMCamModal({ 
  isOpen,
  open,
  onClose,
  onOpenChange,
  horseId,
  horseName = "Pferd",
  onPhotoCapture,
  onComplete,
  mode = "provider",
}: HMCamModalProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<{ url: string; view: HoofView }[]>([]);
  
  // Support both prop patterns
  const dialogOpen = open ?? isOpen ?? false;
  const handleClose = () => {
    if (capturedPhotos.length > 0) {
      onComplete?.(capturedPhotos);
    }
    onClose?.();
    onOpenChange?.(false);
    setCapturedPhotos([]);
  };

  const handleCapture = (url: string, view: HoofView) => {
    const newPhoto = { url, view };
    setCapturedPhotos(prev => [...prev, newPhoto]);
    onPhotoCapture?.(url, view);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(openState) => {
      if (!openState) handleClose();
      else onOpenChange?.(openState);
    }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>HM-CAM • {horseName}</DialogTitle>
        </DialogHeader>
        <HMCamCapture
          horseId={horseId}
          onPhotoCapture={handleCapture}
          onCancel={handleClose}
          className="max-h-[80vh]"
        />
      </DialogContent>
    </Dialog>
  );
}
