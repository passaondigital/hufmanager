import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Ersatz für KI-Einstellungen/Routinen, solange FEATURE_FLAGS.hufiAssistant aus ist.
// Der Link zu /hufi/memory bleibt, damit gespeicherte Einträge einsehbar und
// löschbar bleiben (DSGVO Art. 15/17, siehe Datenschutzerklärung).
export function HufiAssistantUnavailableCard() {
  return (
    <Card data-testid="hufi-assistant-unavailable">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Hufi-Assistent
        </CardTitle>
        <CardDescription>Der Hufi-Assistent ist derzeit nicht verfügbar.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Deine Daten bleiben unverändert. Gespeicherte Hufi-Einträge kannst du weiterhin{" "}
        <Link to="/hufi/memory" className="underline">ansehen und löschen</Link>.
      </CardContent>
    </Card>
  );
}
