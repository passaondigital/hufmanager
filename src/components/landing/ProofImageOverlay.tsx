import { useState } from "react";
import { ZoomIn, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProofImageOverlayProps {
  proofImageUrl: string;
  source: string;
  children: React.ReactNode;
}

const sourceLabels: Record<string, string> = {
  App: "App",
  WhatsApp: "WhatsApp",
  Google: "Google",
  Email: "E-Mail",
};

export const ProofImageOverlay = ({
  proofImageUrl,
  source,
  children,
}: ProofImageOverlayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!proofImageUrl) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Thumbnail below the card */}
      {!imageError && (
        <div 
          className="mt-4 cursor-pointer group"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative rounded-xl overflow-hidden border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
            <img
              src={proofImageUrl}
              alt={`${sourceLabels[source] || source} Screenshot`}
              className="w-full h-[120px] object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                <span className="text-muted-foreground text-sm">Lädt...</span>
              </div>
            )}
            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                <ZoomIn className="h-4 w-4" />
                Vergrößern
              </div>
            </div>
            {/* Premium badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
              <span>📸</span>
              <span>Bild-Nachweis</span>
            </div>
            {/* Source indicator */}
            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-md border border-border/50">
              {sourceLabels[source] || source}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {sourceLabels[source] || source} Bewertung - Original
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={proofImageUrl}
                alt={`${sourceLabels[source] || source} Screenshot`}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Original-Screenshot der {sourceLabels[source] || source} Bewertung
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};