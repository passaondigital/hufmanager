import { AlertTriangle, Clock, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentBlockedScreenProps {
  portalUrl?: string;
  variant?: "past_due" | "trial_expired";
}

export function PaymentBlockedScreen({ portalUrl, variant = "past_due" }: PaymentBlockedScreenProps) {
  const isTrialExpired = variant === "trial_expired";

  const handlePrimaryAction = () => {
    if (isTrialExpired) {
      window.open("https://hufiapp.de/#preise", "_blank");
    } else if (portalUrl) {
      window.open(portalUrl, "_blank");
    } else {
      window.open("https://hufiapp.de/billing", "_blank");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive/50 bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            {isTrialExpired
              ? <Clock className="h-10 w-10 text-destructive" />
              : <AlertTriangle className="h-10 w-10 text-destructive" />
            }
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isTrialExpired ? "Testphase beendet" : "Zahlung fehlgeschlagen"}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {isTrialExpired
              ? "Deine 14-tägige Testphase ist abgelaufen."
              : "Dein Abo konnte nicht verlängert werden."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            {isTrialExpired ? (
              <p>
                Wähle jetzt dein Hufi-Abo, um weiterhin alle Funktionen zu nutzen —
                Terminplanung, Pferdeakten, Rechnungen und KI-Unterstützung.
              </p>
            ) : (
              <p>
                Die letzte Zahlung für dein Hufi-Abo konnte nicht verarbeitet werden.
                Bitte aktualisiere deine Zahlungsinformationen, um den vollen Zugang wiederherzustellen.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePrimaryAction}
              className="w-full h-12 text-base gap-2"
            >
              {isTrialExpired
                ? <><Sparkles className="h-5 w-5" />Jetzt Abo wählen<ExternalLink className="h-4 w-4 ml-auto" /></>
                : <><CreditCard className="h-5 w-5" />Zahlungsdaten aktualisieren<ExternalLink className="h-4 w-4 ml-auto" /></>
              }
            </Button>

            <a
              href="mailto:kontakt@hufiapp.de"
              className="block text-center text-sm text-primary hover:underline"
            >
              Hilfe benötigt? Kontaktiere den Support
            </a>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {isTrialExpired
              ? "Nach Abschluss deines Abos wird dein Zugang sofort freigeschaltet."
              : "Nach erfolgreicher Zahlung wird dein Zugang automatisch wiederhergestellt."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
