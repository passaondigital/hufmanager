import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, Smartphone, ExternalLink, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  icalToken: string | null;
}

export function CalendarSyncModal({ isOpen, onClose, icalToken }: CalendarSyncModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const icalUrl = icalToken
    ? `https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/serve-ical-feed?token=${icalToken}`
    : "";

  const googleCalendarUrl = icalToken
    ? `https://calendar.google.com/calendar/r?cid=webcal://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/serve-ical-feed?token=${icalToken}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast({
        title: "Link kopiert!",
        description: "Der Kalender-Link wurde in die Zwischenablage kopiert.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Link konnte nicht kopiert werden.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateToken = async () => {
    if (!user?.id) return;
    
    setIsRegenerating(true);
    try {
      // Generate a new UUID for the token
      const newToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from("profiles")
        .update({ ical_token: newToken })
        .eq("id", user.id);
      
      if (error) throw error;
      
      // Invalidate the profile query to refresh the token
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      
      toast({
        title: "Token erneuert",
        description: "Dein Kalender-Token wurde erneuert. Bestehende Kalender-Abos funktionieren nicht mehr.",
      });
      
      setShowRegenerateConfirm(false);
    } catch (error) {
      console.error("Failed to regenerate token:", error);
      toast({
        title: "Fehler",
        description: "Token konnte nicht erneuert werden.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mit Handy synchronisieren
            </DialogTitle>
            <DialogDescription>
              Abonniere deinen HufManager-Kalender in deiner Kalender-App
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Copy Link */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <h3 className="font-semibold">Link kopieren</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={icalUrl}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button onClick={handleCopy} variant="outline" size="icon">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Security warning */}
              <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Privat halten:</strong> Jeder mit diesem Link kann deine Termine sehen. Teile ihn nicht.
                </p>
              </div>
            </div>

            {/* Step 2: Instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <h3 className="font-semibold">Als Kalender-Abo hinzufügen</h3>
              </div>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium text-foreground">📱 iPhone / iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Öffne <strong>Einstellungen → Kalender → Accounts</strong></li>
                    <li>Tippe auf <strong>Account hinzufügen → Andere</strong></li>
                    <li>Wähle <strong>Kalenderabo hinzufügen</strong></li>
                    <li>Füge den kopierten Link ein</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium text-foreground">🤖 Android / Google Kalender:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Öffne <strong>calendar.google.com</strong> im Browser</li>
                    <li>Klicke auf <strong>+ → Per URL</strong></li>
                    <li>Füge den kopierten Link ein</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(googleCalendarUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Direkt zu Google Kalender
              </Button>
              
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Kalender-Token erneuern
              </Button>
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              ℹ️ Dein Kalender wird automatisch synchronisiert. Änderungen erscheinen 
              innerhalb weniger Minuten auf deinem Handy.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Token Confirmation Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Kalender-Token erneuern?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Wenn du das Token erneuerst, funktionieren <strong>alle bestehenden Kalender-Abos nicht mehr</strong>.
                </p>
                <p className="text-amber-600 dark:text-amber-400">
                  Du musst den neuen Link danach in all deinen Kalender-Apps neu hinzufügen.
                </p>
                <p>
                  Erneuere das Token nur, wenn du glaubst, dass jemand Unbefugtes Zugriff auf deinen Kalender-Link hat.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRegenerateToken}
              disabled={isRegenerating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird erneuert...
                </>
              ) : (
                "Ja, Token erneuern"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
