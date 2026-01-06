import { useState } from "react";
import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProofImageAttachmentProps {
  proofImageUrl: string;
}

export const ProofImageAttachment = ({
  proofImageUrl,
}: ProofImageAttachmentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!proofImageUrl || imageError) {
    return null;
  }

  return (
    <>
      {/* Compact attachment thumbnail inside the card */}
      <div 
        className="mt-4 cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        <div className="relative max-h-[160px] rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <img
            src={proofImageUrl}
            alt="Bewertungsnachweis"
            className="w-full h-[160px] object-cover transition-all duration-300 group-hover:brightness-75"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
              <span className="text-muted-foreground text-sm">Lädt...</span>
            </div>
          )}
          {/* Badge top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            <span>📸</span>
            <span>Bild-Nachweis</span>
          </div>
          {/* Zoom icon on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white shadow-lg">
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              📸 Bewertungsnachweis
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={proofImageUrl}
                alt="Bewertungsnachweis"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Original-Screenshot der Kundenbewertung
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};