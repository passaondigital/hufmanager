import { useState } from "react";
import { ZoomIn, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
          className="mt-3 cursor-pointer group"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/30">
            <img
              src={proofImageUrl}
              alt={`${sourceLabels[source] || source} Screenshot`}
              className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                <span className="text-muted-foreground text-sm">Lädt...</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white bg-black/60 px-3 py-1.5 rounded-full text-sm">
                <ZoomIn className="h-4 w-4" />
                Vergrößern
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 left-2 text-xs bg-background/90 backdrop-blur-sm"
            >
              {sourceLabels[source] || source} Nachweis
            </Badge>
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