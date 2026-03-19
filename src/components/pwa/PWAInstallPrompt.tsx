import { useState, useEffect } from 'react';
import { X, Download, Share, Plus, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, isMacSafari, deviceType, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISSED_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setIsDismissed(true);
    setShowIOSInstructions(false);
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS || isMacSafari) {
      setShowIOSInstructions(true);
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // Don't show if no install option available (and not iOS/Mac Safari)
  if (!canInstall && !isIOS && !isMacSafari) {
    return null;
  }

  // iOS / Mac Safari Instructions Modal
  if (showIOSInstructions && (isIOS || isMacSafari)) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <img src="/hufmanager-logo.png" alt="HufManager" className="h-8 w-auto" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">App installieren</h3>
                <p className="text-sm text-muted-foreground">
                  {isMacSafari ? "Folge diesen Schritten in Safari" : "Folge diesen Schritten"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {isMacSafari && !isIOS ? (
              <>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Klicke in der Menüleiste auf <strong>Ablage</strong> → <strong>Zum Dock hinzufügen</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Oder: <Share className="inline h-4 w-4 mx-1" /> <strong>Teilen</strong> → <Plus className="inline h-4 w-4 mx-1" /> <strong>Zum Dock hinzufügen</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Klicke auf <strong>Hinzufügen</strong> – fertig!
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  💡 Tipp: Funktioniert ab macOS Sonoma (14) und Safari 17. Falls du die Option nicht siehst, aktualisiere macOS.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Tippe auf <Share className="inline h-4 w-4 mx-1" /> <strong>Teilen</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Wähle <Plus className="inline h-4 w-4 mx-1" /> <strong>Zum Home-Bildschirm</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Tippe auf <strong>Hinzufügen</strong>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button 
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleDismiss}
          >
            Verstanden
          </Button>
        </div>
      </div>
    );
  }

  // Mobile Banner (for iOS or Android with prompt)
  if (deviceType === 'mobile') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">App installieren</p>
            <p className="text-xs text-muted-foreground truncate">Für ein besseres Erlebnis</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDismiss}
              className="h-9 w-9"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleInstallClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4"
            >
              Installieren
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mac Safari: show desktop banner with install instructions
  if (isMacSafari) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">Als App installieren</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                HufManager als Desktop-App im Dock nutzen
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 text-xs"
                >
                  Später
                </Button>
                <Button 
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Anleitung
                </Button>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDismiss}
              className="h-6 w-6 -mt-1 -mr-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet Banner
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Als Programm installieren</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Schnellerer Zugriff direkt vom Desktop
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDismiss}
                className="h-8 text-xs"
              >
                Später
              </Button>
              <Button 
                size="sm"
                onClick={handleInstallClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Installieren
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss}
            className="h-6 w-6 -mt-1 -mr-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
