import { RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ClientErrorFallback() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center p-6">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-4xl">😕</div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              Ups, hier ist etwas schiefgelaufen
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Keine Sorge — deine Daten sind sicher. Versuche es einfach nochmal.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Seite neu laden
            </Button>
            <Button size="sm" onClick={() => window.location.href = "/client-home"} className="gap-1.5">
              <Home className="h-4 w-4" />
              Zur Startseite
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
