import { AlertTriangle, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentBlockedScreenProps {
  portalUrl?: string;
}

export function PaymentBlockedScreen({ portalUrl }: PaymentBlockedScreenProps) {
  const handleManagePayment = () => {
    if (portalUrl) {
      window.open(portalUrl, "_blank");
    } else {
      window.open("https://hufmanager.de/billing", "_blank");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive/50 bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Zahlung fehlgeschlagen
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Dein Abo konnte nicht verlängert werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Die letzte Zahlung für dein HufManager-Abo konnte nicht verarbeitet werden. 
              Bitte aktualisiere deine Zahlungsinformationen, um den vollen Zugang wiederherzustellen.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleManagePayment}
              className="w-full h-12 text-base gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Zahlungsdaten aktualisieren
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
            
            <a 
              href="mailto:support@hufmanager.de"
              className="block text-center text-sm text-primary hover:underline"
            >
              Hilfe benötigt? Kontaktiere den Support
            </a>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Nach erfolgreicher Zahlung wird dein Zugang automatisch wiederhergestellt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
