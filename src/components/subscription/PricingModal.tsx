import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";

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
    id: "starter",
    name: "Starter",
    price: "9,90",
    period: "pro Monat",
    description: "Für Einsteiger mit bis zu 10 Pferden",
    features: [
      "Kalender & Termine",
      "Kundenverwaltung (bis 10 Pferde)",
      "Digitale Pferdeakte",
      "Mein Office & Lager",
      "Basis-Support",
    ],
    checkoutUrl: "https://copecart.com/products/9bb65569/checkout",
    icon: Zap,
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29",
    period: "pro Monat",
    description: "Für aktive Betriebe mit bis zu 75 Pferden",
    features: [
      "Alles aus Starter",
      "Bis zu 75 Pferde",
      "AutoFlow-Automatisierung",
      "HM Connect & Netzwerk",
      "GPS-Navigation & Karten",
      "Prioritäts-Support",
    ],
    checkoutUrl: "https://copecart.com/products/ec500b5e/checkout",
    icon: Sparkles,
    highlighted: true,
    badge: "Meistgewählt",
  },
  {
    id: "duo",
    name: "Duo",
    price: "49",
    period: "pro Monat",
    description: "Für wachsende Betriebe mit bis zu 150 Pferden",
    features: [
      "Alles aus Pro",
      "Bis zu 150 Pferde",
      "Mitarbeiter-App (bis 2 MA)",
      "Team-Management",
      "Premium-Support",
    ],
    checkoutUrl: "https://copecart.com/products/483bbb5b/checkout",
    icon: Crown,
    highlighted: false,
  },
  {
    id: "team",
    name: "Team",
    price: "79",
    period: "pro Monat",
    description: "Für große Betriebe – unbegrenzt",
    features: [
      "Alles aus Duo",
      "Unbegrenzt Pferde",
      "Unbegrenzt Mitarbeiter",
      "Erweiterte Analysen",
      "Dedicated Support",
    ],
    checkoutUrl: "https://copecart.com/products/team-checkout/checkout",
    icon: Crown,
    highlighted: false,
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

  const handleSelectPlan = (planId: string, checkoutUrl: string) => {
    // Track the click for demo analytics
    trackCopecartClick(planId, checkoutUrl);

    window.open(checkoutUrl, "_blank");
    onOpenChange(false);
  };

  // Filter plans based on current plan for upgrade view
  const availablePlans = currentPlan
    ? PRICING_PLANS.filter((plan) => {
        const planOrder = ["starter", "pro", "duo", "team"];
        return planOrder.indexOf(plan.id) > planOrder.indexOf(currentPlan);
      })
    : PRICING_PLANS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  className={cn(
                    "w-full min-h-[44px] h-12 text-sm font-semibold gap-2"
                  )}
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  {isDemoContext
                    ? "Demo verlassen & eigenen Account anlegen"
                    : "Paket wählen"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Abrechnung über Copecart. Monatlich kündbar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
