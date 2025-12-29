import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, ExternalLink } from "lucide-react";

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
  const [showOverlay, setShowOverlay] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!proofImageUrl) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Trigger area with visual hint */}
      <div
        className="relative cursor-pointer group"
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
        onTouchStart={() => setShowOverlay(true)}
        onTouchEnd={() => setTimeout(() => setShowOverlay(false), 2000)}
      >
        {children}
        
        {/* Visual hint for proof availability */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-3 w-3" />
          <span>Nachweis von {sourceLabels[source] || source}</span>
        </div>
      </div>

      {/* Overlay */}
      {showOverlay && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-background/90 backdrop-blur-md",
            "animate-in fade-in-0 duration-200"
          )}
          onClick={() => setShowOverlay(false)}
        >
          <div className="relative max-w-2xl max-h-[80vh] w-full mx-4">
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="bg-card rounded-xl overflow-hidden shadow-2xl border border-border">
              <div className="p-3 bg-muted/50 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  Original von {sourceLabels[source] || source}
                </span>
              </div>
              
              <div className="relative">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                    <span className="text-muted-foreground">Lädt...</span>
                  </div>
                )}
                <img
                  src={proofImageUrl}
                  alt="Bewertungsnachweis"
                  className={cn(
                    "w-full h-auto max-h-[60vh] object-contain",
                    !imageLoaded && "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
