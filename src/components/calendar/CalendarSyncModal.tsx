import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, Smartphone, ExternalLink } from "lucide-react";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  icalToken: string | null;
}

export function CalendarSyncModal({ isOpen, onClose, icalToken }: CalendarSyncModalProps) {
  const [copied, setCopied] = useState(false);

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

  return (
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
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            ℹ️ Dein Kalender wird automatisch synchronisiert. Änderungen erscheinen 
            innerhalb weniger Minuten auf deinem Handy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
