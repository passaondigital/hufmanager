import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ShieldCheck, Volume2, Mic } from "lucide-react";
import { useKiSettings } from "@/hooks/useKiSettings";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { toast } from "sonner";

const VOICE_GREETING_KEY = "hufi_voice_greeting_enabled";
const HEY_HUFI_KEY = "hufi_hey_hufi_enabled";

export function KiSettingsCard() {
  const { kiEnabled, isLoading, setKiEnabled, isToggling } = useKiSettings();
  const { speak, isSupported: ttsSupported, isSpeaking } = useHufiTTS();
  const [voiceGreeting, setVoiceGreeting] = useState<boolean>(false);
  const [heyHufi, setHeyHufi] = useState<boolean>(false);
  // When true, show the explicit privacy opt-in panel before enabling.
  const [heyHufiPendingConsent, setHeyHufiPendingConsent] = useState<boolean>(false);

  const srSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVoiceGreeting(localStorage.getItem(VOICE_GREETING_KEY) === "1");
    setHeyHufi(localStorage.getItem(HEY_HUFI_KEY) === "1");
  }, []);

  const handleToggle = (checked: boolean) => {
    setKiEnabled(checked);
    toast.success(checked ? "KI-Features aktiviert" : "KI-Features deaktiviert", {
      description: checked
        ? "Alle KI-gestützten Funktionen sind jetzt verfügbar."
        : "Alle KI-gestützten Funktionen wurden deaktiviert.",
    });
  };

  const handleVoiceGreetingToggle = (checked: boolean) => {
    if (typeof window === "undefined") return;
    if (checked) localStorage.setItem(VOICE_GREETING_KEY, "1");
    else localStorage.removeItem(VOICE_GREETING_KEY);
    setVoiceGreeting(checked);
    toast.success(checked ? "Hufi spricht dich an" : "Hufi spricht nicht mehr", {
      description: checked
        ? "Beim Öffnen von Hufi hörst du einmal pro Tag eine kurze Begrüßung."
        : "Die gesprochene Begrüßung ist deaktiviert.",
    });
  };

  const handleHeyHufiToggle = (checked: boolean) => {
    if (typeof window === "undefined") return;
    if (!checked) {
      // Disable: no confirmation needed.
      localStorage.removeItem(HEY_HUFI_KEY);
      setHeyHufi(false);
      setHeyHufiPendingConsent(false);
      toast.success("Hey Hufi deaktiviert", {
        description: "Hintergrund-Lauschen deaktiviert.",
      });
      return;
    }
    // Enable: show inline consent panel first, don't store yet.
    setHeyHufiPendingConsent(true);
  };

  const confirmHeyHufi = () => {
    localStorage.setItem(HEY_HUFI_KEY, "1");
    setHeyHufi(true);
    setHeyHufiPendingConsent(false);
    toast.success("Hey Hufi aktiviert", {
      description: "Sag 'Hey Hufi', 'Hufi' oder 'Okay Hufi' — Hufi antwortet.",
    });
  };

  const cancelHeyHufi = () => {
    setHeyHufiPendingConsent(false);
  };

  const handleVoiceTest = () => {
    if (!ttsSupported) {
      toast.error("Sprachausgabe wird in diesem Browser nicht unterstützt.");
      return;
    }
    // Independent of the once-per-day gate. Triggered by an explicit click,
    // so the browser audio gesture requirement is satisfied.
    speak("Hallo, ich bin Hufi. So klingt deine Begrüßung.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          KI-Features
          {kiEnabled && (
            <Badge variant="secondary" className="text-xs">Aktiv</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Verwalte alle KI-gestützten Funktionen in deinem Account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">KI-Features aktivieren</p>
            <p className="text-xs text-muted-foreground">
              Beinhaltet: Hufi-Assistent, intelligente Belegerfassung, KI-Analysen
            </p>
          </div>
          <Switch
            checked={kiEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || isToggling}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              Hufi spricht mich an
            </p>
            <p className="text-xs text-muted-foreground">
              Spricht einmal pro Tag nach erster Berührung der App eine kurze Begrüßung.
              {!ttsSupported && (
                <span className="block mt-1 text-destructive">
                  Dein Browser unterstützt keine Sprachausgabe — Toggle ist deaktiviert.
                </span>
              )}
            </p>
          </div>
          <Switch
            checked={voiceGreeting && ttsSupported}
            onCheckedChange={handleVoiceGreetingToggle}
            disabled={!ttsSupported}
          />
        </div>

        {ttsSupported && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVoiceTest}
              disabled={isSpeaking}
              className="gap-1.5"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isSpeaking ? "Spricht…" : "Begrüßung jetzt testen"}
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-muted-foreground" />
                Hey Hufi aktivieren
              </p>
              {srSupported ? (
                <p className="text-xs text-muted-foreground">
                  Sag <span className="font-medium">"Hey Hufi"</span>,{" "}
                  <span className="font-medium">"Hufi"</span> oder{" "}
                  <span className="font-medium">"Okay Hufi"</span> — Hufi antwortet sofort.
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  Hey Hufi ist auf diesem Gerät nicht verfügbar. Nutze den Mikrofon-Button.
                </p>
              )}
            </div>
            <Switch
              checked={(heyHufi || heyHufiPendingConsent) && srSupported}
              onCheckedChange={handleHeyHufiToggle}
              disabled={!srSupported}
            />
          </div>

          {/* Inline opt-in consent — shown before Hey Hufi is actually enabled */}
          {heyHufiPendingConsent && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">
                  <strong>Datenschutz-Hinweis:</strong> Hey Hufi nutzt die
                  Browser-eigene Spracherkennung (Web Speech API). Dein Mikrofon
                  läuft kontinuierlich und Audio wird vom Browser an{" "}
                  <strong>externe Server (Google)</strong> gesendet. Hufi hört
                  erst nach dem Schlüsselwort zu. Du kannst jederzeit
                  deaktivieren.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelHeyHufi}
                  className="h-8 text-xs"
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={confirmHeyHufi}
                  className="h-8 text-xs gap-1.5"
                >
                  <Mic className="h-3 w-3" />
                  Ja, aktivieren
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Datenschutz-Hinweis:</strong> Wenn KI-Features aktiviert sind, werden Daten zur Verarbeitung
              an KI-Modelle gesendet. Hufi speichert keine KI-Konversationen und nutzt deine Daten
              nicht für Trainingszwecke.
            </p>
            <p>
              Du kannst KI-Features jederzeit deaktivieren. Bereits gespeicherte Ergebnisse
              (z.B. gescannte Belege) bleiben erhalten.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
