import { Loader2 } from "lucide-react";

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <img 
            src="https://upload.assaon.com/files/medien/goldenespferd.png" 
            alt="Hufi" 
            className="h-16 w-16 animate-pulse"
          />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Wird geladen...</span>
        </div>
      </div>
    </div>
  );
}
