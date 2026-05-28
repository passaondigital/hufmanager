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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Apple,
  Globe,
  Monitor,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  icalToken: string | null;
}

type Platform = "iphone" | "android" | "outlook" | "general";

const PLATFORM_GUIDES: Record<
  Platform,
  { label: string; icon: React.ReactNode; steps: string[] }
> = {
  iphone: {
    label: "iPhone / iPad",
    icon: <Apple className="h-4 w-4" />,
    steps: [
      'Öffne die App "Einstellungen" auf deinem iPhone',
      'Scrolle nach unten und tippe auf "Kalender"',
      'Tippe auf "Accounts" → "Account hinzufügen"',
      'Wähle ganz unten "Andere"',
      'Tippe auf "Kalenderabo hinzufügen"',
      "Füge den kopierten Link in das Feld ein",
      'Tippe auf "Weiter" und dann auf "Sichern"',
      "✅ Fertig! Deine Termine erscheinen jetzt im Kalender",
    ],
  },
  android: {
    label: "Android / Google Kalender",
    icon: <Globe className="h-4 w-4" />,
    steps: [
      'Öffne einen Browser (Chrome) und gehe zu "calendar.google.com"',
      "Melde dich mit deinem Google-Konto an",
      'Klicke links auf das "+" neben "Weitere Kalender"',
      'Wähle "Per URL"',
      "Füge den kopierten Link in das Feld ein",
      'Klicke auf "Kalender hinzufügen"',
      "✅ Fertig! Der Kalender synchronisiert sich automatisch mit deinem Handy",
    ],
  },
  outlook: {
    label: "Outlook / Microsoft",
    icon: <Monitor className="h-4 w-4" />,
    steps: [
      "Öffne Outlook (Web: outlook.live.com oder Desktop-App)",
      'Klicke auf das Kalender-Symbol in der Seitenleiste',
      'Klicke auf "Kalender hinzufügen" → "Aus dem Internet abonnieren"',
      "Füge den kopierten Link in das URL-Feld ein",
      'Gib einen Namen ein (z.B. "HufManager")',
      'Klicke auf "Importieren"',
      "✅ Fertig! Termine werden automatisch synchronisiert",
    ],
  },
  general: {
    label: "Andere Kalender-Apps",
    icon: <HelpCircle className="h-4 w-4" />,
    steps: [
      "Öffne deine Kalender-App",
      'Suche die Option "Kalender abonnieren" oder "Per URL hinzufügen"',
      "Füge den kopierten iCal-Link ein",
      "Speichere den Kalender",
      "Die Termine werden automatisch synchronisiert (meist alle 15–60 Minuten)",
    ],
  },
};

export function CalendarSyncModal({
  isOpen,
  onClose,
  icalToken,
}: CalendarSyncModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
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
    } catch {
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
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("profiles")
        .update({ ical_token: newToken })
        .eq("id", user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["ical-token"] });

      toast({
        title: "Token erneuert",
        description:
          "Dein Kalender-Token wurde erneuert. Bestehende Abos müssen neu eingerichtet werden.",
      });

      setShowRegenerateConfirm(false);
    } catch {
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
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Kalender synchronisieren
            </DialogTitle>
            <DialogDescription>
              Verbinde deinen HufManager-Kalender mit deinem Smartphone — ganz einfach.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* How it works */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">So funktioniert's:</strong> Dein
                HufManager-Kalender wird als{" "}
                <Badge variant="secondary" className="text-xs">
                  Live-Abo
                </Badge>{" "}
                in deine Kalender-App eingebunden. Alle Änderungen synchronisieren sich
                automatisch — du musst nichts weiter tun.
              </p>
            </div>

            {/* Step 1: Copy Link */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <h3 className="font-semibold">Link kopieren</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={icalUrl}
                  readOnly
                  className="text-xs font-mono"
                  placeholder="Kein Token vorhanden..."
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                  disabled={!icalToken}
                >
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
                  <strong>Privat halten:</strong> Jeder mit diesem Link kann deine Termine
                  sehen. Teile ihn nicht weiter.
                </p>
              </div>
            </div>

            <Separator />

            {/* Step 2: Choose Platform */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <h3 className="font-semibold">Dein Gerät wählen</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLATFORM_GUIDES) as Platform[]).map((platform) => {
                  const guide = PLATFORM_GUIDES[platform];
                  return (
                    <Button
                      key={platform}
                      variant={selectedPlatform === platform ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 justify-start text-xs h-9"
                      onClick={() =>
                        setSelectedPlatform(
                          selectedPlatform === platform ? null : platform
                        )
                      }
                    >
                      {guide.icon}
                      {guide.label}
                    </Button>
                  );
                })}
              </div>

              {/* Step-by-step guide */}
              {selectedPlatform && (
                <div className="rounded-lg bg-muted/50 border p-4 space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                  <p className="font-medium text-sm flex items-center gap-2">
                    {PLATFORM_GUIDES[selectedPlatform].icon}
                    {PLATFORM_GUIDES[selectedPlatform].label} — Schritt für Schritt
                  </p>
                  <ol className="list-none space-y-2 mt-3">
                    {PLATFORM_GUIDES[selectedPlatform].steps.map((step, i) => {
                      const isLast = step.startsWith("✅");
                      return (
                        <li
                          key={i}
                          className={`flex gap-2 text-sm ${
                            isLast
                              ? "text-green-600 dark:text-green-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {!isLast && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                          )}
                          <span>{step.replace(/✅\s?/, "")}</span>
                          {isLast && <Check className="h-4 w-4 shrink-0 mt-0.5" />}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(googleCalendarUrl, "_blank")}
                disabled={!icalToken}
              >
                <ExternalLink className="h-4 w-4" />
                Direkt zu Google Kalender hinzufügen
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
                Kalender-Token erneuern (bei Sicherheitsbedenken)
              </Button>
            </div>

            {/* FAQ */}
            <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/30 rounded-lg p-3">
              <p className="font-medium text-foreground text-sm mb-2">Häufige Fragen</p>
              <p>
                <strong>Wie oft synchronisiert sich der Kalender?</strong> Automatisch alle
                15–60 Minuten, je nach Kalender-App.
              </p>
              <p>
                <strong>Kann ich Termine im Handy-Kalender ändern?</strong> Nein, es ist ein
                Lese-Abo. Änderungen werden immer im HufManager gemacht.
              </p>
              <p>
                <strong>Muss ich etwas bezahlen?</strong> Nein, die Synchronisation ist
                kostenlos und in allen Plänen enthalten.
              </p>
            </div>
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
                  Wenn du das Token erneuerst, funktionieren{" "}
                  <strong>alle bestehenden Kalender-Abos nicht mehr</strong>.
                </p>
                <p className="text-amber-600 dark:text-amber-400">
                  Du musst den neuen Link danach in all deinen Kalender-Apps neu
                  hinzufügen.
                </p>
                <p>
                  Erneuere das Token nur, wenn du glaubst, dass jemand Unbefugtes
                  Zugriff auf deinen Kalender-Link hat.
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
