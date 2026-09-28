import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useHufmanagerSlimAccess } from "@/hooks/useHufmanagerSlimAccess";
import { HUFMANAGER_SLIM_TEXT } from "@/config/subscriptionPlans";
import { slimTrialInfo } from "@/lib/slimTrial";
import { PricingModal } from "./PricingModal";
import { lastValidDayFromExclusiveEnd } from "@/lib/providerPlanGrants";

// HufManager Slim: ein Tarif, Zustand ausschließlich aus product_entitlements (Access-Context).
// Kauf läuft über das PricingModal (Widerrufs-Zustimmung → CopeCart-Checkout), Verwaltung über das CopeCart-Portal.
const COPECART_LOGIN_URL = "https://copecart.com/login";

function formatDay(day: string): string {
  return day ? `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}` : "";
}

export function SlimSubscriptionCard() {
  const { context, loading } = useHufmanagerSlimAccess();
  const [pricingOpen, setPricingOpen] = useState(false);

  if (loading && !context) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const code = context?.reasonCode ?? "NO_ENTITLEMENT";
  const trial = slimTrialInfo(code, context?.trialEndsAt);
  const manualEnd = context?.currentPeriodEnd ? formatDay(lastValidDayFromExclusiveEnd(context.currentPeriodEnd)) : "";
  let statusLabel = "Kein aktiver Zugang";
  let detail = "Schalte HufManager frei, um weiterzuarbeiten.";
  let canBuy = true;
  let canManage = false;
  switch (code) {
    case "ACTIVE_TRIAL":
      statusLabel = "Testphase";
      detail = trial ? `Noch ${trial.daysLeft} ${trial.daysLeft === 1 ? "Tag" : "Tage"} kostenlos – bis ${trial.endDateLabel}.` : "Testphase aktiv.";
      break;
    case "ACTIVE_PAID":
      statusLabel = "Aktiv";
      detail = "Dein Abo ist aktiv.";
      canBuy = false; canManage = true;
      break;
    case "CANCELLED_PERIOD_END_ACCESS":
      statusLabel = "Gekündigt";
      detail = "Dein Zugang läuft bis zum Ende des bezahlten Zeitraums.";
      canManage = true;
      break;
    case "PAST_DUE_ACCESS_PRESERVED":
      statusLabel = "Zahlung ausstehend";
      detail = "Bitte prüfe deine Zahlung im CopeCart-Kundenportal.";
      canBuy = false; canManage = true;
      break;
    case "ACTIVE_MANUAL":
      statusLabel = "Manueller Zugang";
      detail = manualEnd ? `Freigeschaltet bis einschließlich ${manualEnd}.` : "Dauerhaft freigeschaltet.";
      canBuy = !!manualEnd;
      break;
    case "TRIAL_EXPIRED":
      statusLabel = "Testphase beendet";
      detail = "Schalte HufManager jetzt frei – deine Daten bleiben erhalten.";
      break;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {HUFMANAGER_SLIM_TEXT.productName}
              </CardTitle>
              <CardDescription>19,95 € / Monat · ein Tarif, alles inklusive</CardDescription>
            </div>
            <Badge variant="secondary">{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{detail}</p>
          {canBuy && (
            <Button className="h-auto w-full whitespace-normal py-3" onClick={() => setPricingOpen(true)}>
              Jetzt HufManager freischalten – 19,95 €/Monat
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(COPECART_LOGIN_URL, "_blank")}>
                Abo verwalten & Rechnungen
                <ExternalLink className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Öffnet das CopeCart-Kundenportal — melde dich dort mit deiner E-Mail-Adresse an.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        title="HufManager freischalten"
        description="19,95 € pro Monat, monatlich kündbar."
        currentPlan={null}
      />
    </>
  );
}
