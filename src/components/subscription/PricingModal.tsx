import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, ArrowRight, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  currentPlan?: string | null;
  showTrialBadge?: boolean;
}

const PRICING_PLANS = [
  {
    id: "starter",
    name: "Anfänger",
    price: "19",
    period: "pro Monat",
    description: "Perfekt für den Einstieg",
    features: [
      "Kalender & Termine",
      "Kundenverwaltung",
      "Digitale Pferdeakte",
      "Basis-Support",
    ],
    checkoutUrl: "https://copecart.com/products/9bb65569/checkout",
    icon: Zap,
    highlighted: false,
  },
  {
    id: "advanced",
    name: "Fortgeschritten",
    price: "49",
    period: "pro Monat",
    description: "Für wachsende Betriebe",
    features: [
      "Alles aus Anfänger",
      "GPS-Navigation zum Stall",
      "Automatische Erinnerungen",
      "Kunden-Chat",
      "Prioritäts-Support",
    ],
    checkoutUrl: "https://copecart.com/products/ec500b5e/checkout",
    icon: Sparkles,
    highlighted: true,
    badge: "Beliebt",
  },
  {
    id: "pro",
    name: "Profi",
    price: "99",
    period: "pro Monat",
    description: "Das Komplettpaket",
    features: [
      "Alles aus Fortgeschritten",
      "KI-Assistent",
      "Academy Zugang",
      "Partner-Programm",
      "Premium-Support",
    ],
    checkoutUrl: "https://copecart.com/products/483bbb5b/checkout",
    icon: Crown,
    highlighted: false,
  },
];

export function PricingModal({ 
  open, 
  onOpenChange, 
  title = "Wähle dein Paket & starte 14 Tage kostenlos!",
  description = "Starte jetzt mit HufManager und digitalisiere dein Hufbearbeiter-Business.",
  currentPlan = null,
  showTrialBadge = true
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
    ? PRICING_PLANS.filter(plan => {
        const planOrder = ["starter", "advanced", "pro"];
        return planOrder.indexOf(plan.id) > planOrder.indexOf(currentPlan);
      })
    : PRICING_PLANS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "grid gap-4 py-4",
          availablePlans.length === 3 ? "md:grid-cols-3" : 
          availablePlans.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" :
          "max-w-md mx-auto"
        )}>
          {availablePlans.map((plan) => {
            const PlanIcon = plan.icon;
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300",
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <Badge 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1"
                  >
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center",
                    plan.highlighted 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <PlanIcon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}€</span>
                  <span className="text-muted-foreground ml-1">/{plan.period}</span>
                </div>

                {/* Trial Badge */}
                {showTrialBadge && (
                  <div className="flex justify-center mb-4">
                    <Badge variant="secondary" className="gap-1.5 bg-accent/20 text-accent-foreground border-accent/30">
                      <Gift className="h-3.5 w-3.5" />
                      14 Tage kostenlos testen
                    </Badge>
                  </div>
                )}

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        plan.highlighted ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id, plan.checkoutUrl)}
                  className={cn(
                    "w-full h-12 text-base font-semibold gap-2",
                    plan.highlighted 
                      ? "bg-primary hover:bg-primary/90" 
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  Jetzt starten
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Die Abrechnung erfolgt sicher über Copecart. Monatlich kündbar.
        </p>
      </DialogContent>
    </Dialog>
  );
}