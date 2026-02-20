import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Smartphone, Check, CloudOff, Loader2, Trash2, Download, Share, Wifi, WifiOff, Cloud } from "lucide-react";
import { CURRENT_APP_VERSION, forceHardReload } from "@/lib/appVersion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useOfflineState } from "@/hooks/useOfflineState";
import { toast } from "sonner";

export function AppSettingsCard() {
  const { user } = useAuth();
  const { canInstall, isInstalled, isMacSafari, isIOS, promptInstall } = usePWAInstall();
  const { isOnline, syncState, pendingMutations, pendingImages, totalPending, lastSyncDate } = useOfflineState();
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{
    version: string;
    message: string;
    isForced: boolean;
  } | null>(null);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Determine user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      const versionKey = profile?.role === "client" 
        ? "app_version_client" 
        : "app_version_provider";

      // Fetch server version
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", versionKey)
        .single();

      if (error || !data) {
        toast.success("App ist aktuell", {
          description: `Version ${CURRENT_APP_VERSION}`,
        });
        setUpdateAvailable(null);
        return;
      }

      const serverVersion = data.value;
      
      if (serverVersion !== CURRENT_APP_VERSION) {
        setUpdateAvailable({
          version: serverVersion,
          message: data.message || "Eine neue Version ist verfügbar.",
          isForced: data.is_forced || false,
        });
        toast.info("Update verfügbar", {
          description: `Version ${serverVersion} ist verfügbar`,
        });
      } else {
        toast.success("App ist aktuell", {
          description: `Version ${CURRENT_APP_VERSION}`,
        });
        setUpdateAvailable(null);
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      toast.error("Fehler beim Prüfen auf Updates");
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    toast.info("Update wird geladen...", {
      description: "Die App wird neu gestartet",
    });
    await forceHardReload();
  };

  const clearAppCache = async () => {
    try {
      // Clear IndexedDB caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      
      // Clear localStorage items (except auth)
      const authKeys = ['sb-', 'supabase'];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && !authKeys.some(ak => key.startsWith(ak))) {
          localStorage.removeItem(key);
        }
      }
      
      toast.success("Cache geleert", {
        description: "Lokale Daten wurden entfernt",
      });
    } catch (error) {
      toast.error("Fehler beim Leeren des Caches");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          App-Einstellungen
        </CardTitle>
        <CardDescription>
          Version, Updates und Offline-Daten verwalten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Version */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Aktuelle Version</p>
            <p className="text-xs text-muted-foreground">
              Installierte App-Version
            </p>
          </div>
          <Badge variant="secondary" className="font-mono">
            v{CURRENT_APP_VERSION}
          </Badge>
        </div>

        <Separator />

        {/* Update Check */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nach Updates suchen</p>
              <p className="text-xs text-muted-foreground">
                Prüft auf neue App-Versionen
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkForUpdates}
              disabled={isChecking}
              className="gap-2"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isChecking ? "Prüfe..." : "Prüfen"}
            </Button>
          </div>

          {/* Update Available Banner */}
          {updateAvailable && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Version {updateAvailable.version} verfügbar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {updateAvailable.message}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleUpdate}
                className="w-full gap-2"
                variant={updateAvailable.isForced ? "default" : "outline"}
              >
                <RefreshCw className="h-4 w-4" />
                Jetzt aktualisieren
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Clear Cache */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Offline-Daten löschen</p>
            <p className="text-xs text-muted-foreground">
              Löscht gecachte Daten (nicht Ihre Anmeldung)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAppCache}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Leeren
          </Button>
        </div>

        {/* Connection Status */}
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Verbindungsstatus</p>
            <p className="text-xs text-muted-foreground">
              Aktuelle Netzwerkverbindung
            </p>
          </div>
          {isOnline ? (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Sync Status */}
        {totalPending > 0 && (
          <>
            <Separator />
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">Wartende Synchronisation</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingMutations > 0 && `${pendingMutations} Änderung${pendingMutations > 1 ? "en" : ""}`}
                {pendingMutations > 0 && pendingImages > 0 && " · "}
                {pendingImages > 0 && `${pendingImages} Bild${pendingImages > 1 ? "er" : ""}`}
                {" "}– wird bei Verbindung automatisch synchronisiert
              </p>
            </div>
          </>
        )}

        {lastSyncDate && totalPending === 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Letzte Synchronisation</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastSyncDate).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                <Check className="h-3 w-3" />
                Synchron
              </Badge>
            </div>
          </>
        )}

        {/* App Installation */}
        <Separator />
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">App installieren</p>
            <p className="text-xs text-muted-foreground">
              HufManager als App auf diesem Gerät installieren
            </p>
          </div>

          {isInstalled ? (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <Check className="h-3 w-3" />
              App ist installiert
            </Badge>
          ) : canInstall ? (
            <Button onClick={promptInstall} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Jetzt installieren
            </Button>
          ) : isIOS || isMacSafari ? (
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Installation auf Apple-Gerät</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Tippe auf das <strong>Teilen</strong>-Symbol (Quadrat mit Pfeil)</li>
                <li>Wähle <strong>„Zum Home-Bildschirm"</strong> bzw. <strong>„Zum Dock hinzufügen"</strong></li>
                <li>Bestätige mit <strong>Hinzufügen</strong></li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Öffne HufManager im Browser, um die Installationsoption zu sehen.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
