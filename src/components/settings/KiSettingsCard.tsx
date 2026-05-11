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
    if (checked) localStorage.setItem(HEY_HUFI_KEY, "1");
    else localStorage.removeItem(HEY_HUFI_KEY);
    setHeyHufi(checked);
    toast.success(checked ? "Hey Hufi aktiviert" : "Hey Hufi deaktiviert", {
      description: checked
        ? "Hufi hört auf das Schlüsselwort 'Hufi' im Hintergrund. Mikrofon läuft dauerhaft."
        : "Hintergrund-Lauschen deaktiviert.",
    });
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

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Mic className="h-4 w-4 text-muted-foreground" />
              Hey Hufi
            </p>
            <p className="text-xs text-muted-foreground">
              Auf das Schlüsselwort 'Hufi' reagieren — ohne Tippen.
              {!srSupported && (
                <span className="block mt-1 text-destructive">
                  Dein Browser unterstützt kein Wake-Word (kein SpeechRecognition).
                </span>
              )}
            </p>
          </div>
          <Switch
            checked={heyHufi && srSupported}
            onCheckedChange={handleHeyHufiToggle}
            disabled={!srSupported}
          />
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
              <strong>Hey Hufi:</strong> Die Spracherkennung nutzt die Browser-eigene Web Speech API.
              Audio wird hierbei vom Browser an externe Server (Google) gesendet.
              Nur aktivieren, wenn dies akzeptiert wird.
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
