import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { HelpCircle, RotateCcw } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "@/hooks/use-toast";

export function TutorialSettingsCard() {
  const [tutorialsEnabled, setTutorialsEnabled] = useLocalStorage("tutorials_enabled", true);
  const [dismissedTutorials, setDismissedTutorials] = useLocalStorage<string[]>(
    "dismissed_tutorials",
    []
  );

  const handleResetTutorials = () => {
    setDismissedTutorials([]);
    toast({
      title: "Anleitungen zurückgesetzt",
      description: "Alle Hilfe-Tooltips werden wieder angezeigt.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Mini-Anleitungen
        </CardTitle>
        <CardDescription>
          Hilfreiche Tooltips und Hinweise in der gesamten App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tutorials-toggle" className="font-medium">
              Anleitungen aktivieren
            </Label>
            <p className="text-sm text-muted-foreground">
              Zeigt hilfreiche Tipps bei wichtigen Funktionen
            </p>
          </div>
          <Switch
            id="tutorials-toggle"
            checked={tutorialsEnabled}
            onCheckedChange={setTutorialsEnabled}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Anleitungen zurücksetzen</p>
            <p className="text-xs text-muted-foreground">
              {dismissedTutorials.length} Tooltip(s) ausgeblendet
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTutorials}
            disabled={dismissedTutorials.length === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
