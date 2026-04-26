import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, ShieldCheck } from "lucide-react";
import { useKiSettings } from "@/hooks/useKiSettings";
import { toast } from "sonner";

export function KiSettingsCard() {
  const { kiEnabled, isLoading, setKiEnabled, isToggling } = useKiSettings();

  const handleToggle = (checked: boolean) => {
    setKiEnabled(checked);
    toast.success(checked ? "KI-Features aktiviert" : "KI-Features deaktiviert", {
      description: checked
        ? "Alle KI-gestützten Funktionen sind jetzt verfügbar."
        : "Alle KI-gestützten Funktionen wurden deaktiviert.",
    });
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
