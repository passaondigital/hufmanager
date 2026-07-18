import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink, Check, AlertCircle, Clock, Loader2, ArrowUpRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "./PricingModal";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  advanced: "Advanced",
  pro: "Profi",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  active: { label: "Aktiv", variant: "default", icon: Check },
  trialing: { label: "Testphase", variant: "secondary", icon: Clock },
  cancelled: { label: "Gekündigt", variant: "outline", icon: AlertCircle },
  past_due: { label: "Zahlung ausstehend", variant: "destructive", icon: AlertCircle },
  lifetime: { label: "Lifetime", variant: "default", icon: Crown },
};

const COPECART_LOGIN_URL = "https://copecart.com/login";

export function SubscriptionCard() {
  const { status, plan, loading } = useSubscription();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const handleManageSubscription = () => {
    window.open(COPECART_LOGIN_URL, "_blank");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[status || "trialing"];
  const StatusIcon = statusConfig.icon;
  
  // Lifetime users have max access and don't need upgrades
  const isLifetime = status === "lifetime";
  const canUpgrade = !isLifetime && plan !== "pro";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
            <div>
                <CardTitle className="text-xl">
                  {isLifetime ? "Lifetime" : PLAN_NAMES[plan || "starter"]} Paket
                </CardTitle>
                <CardDescription>Dein aktuelles Abonnement</CardDescription>
              </div>
            </div>
            <Badge variant={statusConfig.variant} className="gap-1.5">
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Features */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="font-medium mb-3">Enthaltene Features:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Kalender & Terminverwaltung
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Kundenverwaltung
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Digitale Pferdeakte
              </li>
              {(plan === "advanced" || plan === "pro" || isLifetime) && (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    GPS-Navigation
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    KI-Assistent
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Automatische Erinnerungen
                  </li>
                </>
              )}
              {(plan === "pro" || isLifetime) && (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Academy Zugang
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Partner-Programm
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Upgrade Section */}
          {canUpgrade && (
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">
                    Upgrade durchführen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Schalte mehr Features frei
                  </p>
                </div>
                <Button 
                  onClick={() => setUpgradeModalOpen(true)}
                  className="gap-2"
                >
                  Pakete anzeigen
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Manage Subscription Button */}
          <Button
            onClick={handleManageSubscription}
            className="w-full gap-2"
          >
            Abo verwalten & Rechnungen
            <ExternalLink className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Öffnet das CopeCart-Kundenportal — melde dich dort mit deiner E-Mail-Adresse an.
          </p>
        </CardContent>
      </Card>

      {/* Upgrade Pricing Modal */}
      <PricingModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        title="Upgrade durchführen"
        description="Wähle ein höheres Paket und schalte mehr Features frei."
        currentPlan={plan}
      />
    </>
  );
}
