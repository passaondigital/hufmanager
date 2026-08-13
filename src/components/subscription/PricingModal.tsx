import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";
import { WiderrufsausschlussCheckbox } from "@/components/consent/WiderrufsausschlussCheckbox";
import { logConsent } from "@/lib/consent";
import { HUFMANAGER_SLIM_TEXT } from "@/config/subscriptionPlans";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  currentPlan?: string | null;
  showTrialBadge?: boolean;
  isDemoContext?: boolean;
}

const PRICING_PLANS = [
  {
    id: "pro",
    name: HUFMANAGER_SLIM_TEXT.productName,
    price: "19,95",
    period: "pro Monat",
    description: HUFMANAGER_SLIM_TEXT.description,
    features: [
      ...HUFMANAGER_SLIM_TEXT.included,
    ],
    checkoutUrl: HUFMANAGER_SLIM_TEXT.checkoutUrl || "",
    icon: Sparkles,
    highlighted: true,
    badge: HUFMANAGER_SLIM_TEXT.tariffName,
  },
];

export function PricingModal({
  open,
  onOpenChange,
  title = "Pakete & Preise",
  description = "Wähle das passende Paket für deinen Betrieb.",
  currentPlan = null,
  showTrialBadge = true,
  isDemoContext = false,
}: PricingModalProps) {
  const { trackCopecartClick } = useDemoActivityTracker();
  const [widerrufAccepted, setWiderrufAccepted] = useState(false);
  const [widerrufError, setWiderrufError] = useState(false);

  const handleSelectPlan = async (planId: string, checkoutUrl: string) => {
    if (!widerrufAccepted) {
      setWiderrufError(true);
      return;
    }

    // Log consent
    await logConsent("widerrufsausschluss");

    // Track the click for demo analytics
    trackCopecartClick(planId, checkoutUrl);

    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
    onOpenChange(false);
  };

  const availablePlans = PRICING_PLANS;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setWiderrufAccepted(false); setWiderrufError(false); } }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl md:text-2xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Demo context hint */}
        {isDemoContext && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>Du verlässt jetzt den Demo-Modus. Dein eigener Account wird separat angelegt.</span>
          </div>
        )}

        {/* Mobile: Stack vertically, Desktop: Grid */}
        <div
          className={cn(
            "grid gap-4 py-4",
            "grid-cols-1",
            availablePlans.length === 3
              ? "md:grid-cols-3"
              : availablePlans.length === 2
              ? "md:grid-cols-2 max-w-2xl mx-auto"
              : "max-w-md mx-auto"
          )}
        >
          {availablePlans.map((plan) => {
            const PlanIcon = plan.icon;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-lg border p-6",
                  plan.highlighted
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5">
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-md mx-auto mb-3 flex items-center justify-center",
                      plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <PlanIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}€
                  </span>
                  <span className="text-muted-foreground ml-1 text-sm">
                    /{plan.period}
                  </span>
                </div>

                {/* Trial Badge */}
                {showTrialBadge && (
                  <div className="flex justify-center mb-4">
                    <Badge variant="secondary" className="gap-1.5">
                      14 Tage kostenlos testen
                    </Badge>
                  </div>
                )}

                <ul className="space-y-2 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() =>
                    handleSelectPlan(plan.id, plan.checkoutUrl)
                  }
                  disabled={!plan.checkoutUrl}
                  className={cn(
                    "w-full min-h-[44px] h-12 text-sm font-semibold gap-2"
                  )}
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  {isDemoContext
                    ? "Demo verlassen & eigenen Account anlegen"
                    : plan.checkoutUrl
                      ? "Jetzt HufManager buchen"
                      : "Checkout nach CopeCart-Anlage"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Widerrufsausschluss Checkbox */}
        <div className="border-t border-border pt-4">
          <WiderrufsausschlussCheckbox
            checked={widerrufAccepted}
            onCheckedChange={(v) => { setWiderrufAccepted(v); if (v) setWiderrufError(false); }}
            error={widerrufError}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <p>{HUFMANAGER_SLIM_TEXT.productName} · {HUFMANAGER_SLIM_TEXT.productUrl}</p>
          <p>{HUFMANAGER_SLIM_TEXT.billing}</p>
          <p>{HUFMANAGER_SLIM_TEXT.delivery}</p>
          <p>CopeCart Product ID: {HUFMANAGER_SLIM_TEXT.copecartProductId}. Legacy-Checkouts werden nicht für neue Verkäufe verwendet.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
