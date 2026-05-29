import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileGuardianScreenProps {
  isRepairing: boolean;
  error: string | null;
  onRetry?: () => void;
}

/**
 * Full-screen loading/error display for Profile Guardian
 * Shows while the system repairs a missing user profile
 */
export function ProfileGuardianScreen({ isRepairing, error, onRetry }: ProfileGuardianScreenProps) {
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Profil-Fehler
            </h1>
            <p className="text-muted-foreground">
              Dein Benutzerprofil konnte nicht eingerichtet werden.
            </p>
            <p className="text-sm text-destructive/80 font-mono bg-destructive/5 p-2 rounded">
              {error}
            </p>
          </div>
          <div className="flex gap-3">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Erneut versuchen
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/auth"}
            >
              Zur Anmeldung
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isRepairing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-24 w-auto animate-pulse"
        />
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Profil wird eingerichtet...</span>
        </div>
      </div>
    );
  }

  return null;
}
