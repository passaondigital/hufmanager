import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Check, ArrowRight, Sparkles, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPlan?: "advanced" | "pro";
}

const PLANS = [
  {
    id: "starter",
    name: "Anfänger",
    price: "19",
    icon: Zap,
    features: ["Kalender & Termine", "Kundenverwaltung", "Digitale Pferdeakte"],
    checkoutUrl: "https://www.copecart.com/products/8ef10f74/checkout?utm_source=app&utm_medium=upgrade&utm_campaign=direktkauf",
  },
  {
    id: "advanced",
    name: "Fortgeschritten",
    price: "49",
    icon: Sparkles,
    badge: "Empfohlen",
    features: ["Alles aus Anfänger", "GPS-Navigation", "Erinnerungen", "Kunden-Chat"],
    checkoutUrl: "https://www.copecart.com/products/1996da6f/checkout?utm_source=app&utm_medium=upgrade&utm_campaign=direktkauf",
  },
  {
    id: "pro",
    name: "Profi",
    price: "99",
    icon: Crown,
    features: ["Alles aus Fortgeschritten", "KI-Assistent", "Academy", "Team-Management"],
    checkoutUrl: "https://www.copecart.com/products/953da638/checkout?utm_source=app&utm_medium=upgrade&utm_campaign=direktkauf",
  },
];

const PLAN_ORDER = ["starter", "advanced", "pro"];

export function UpgradeModal({ open, onOpenChange, featureName, requiredPlan = "pro" }: UpgradeModalProps) {
  const { plan } = useSubscription();

  // Show only plans above current
  const currentIndex = plan ? PLAN_ORDER.indexOf(plan) : -1;
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
  const upgradePlans = PLANS.filter((_, i) => i > currentIndex && i >= requiredIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {featureName} freischalten
          </DialogTitle>
          <DialogDescription className="text-sm">
            Diese Funktion ist ab dem{" "}
            <span className="font-semibold text-foreground">
              {requiredPlan === "advanced" ? "Fortgeschritten" : "Profi"}
            </span>-Paket verfügbar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {upgradePlans.map((p) => {
            const Icon = p.icon;
            const isHighlighted = p.id === requiredPlan || (upgradePlans.length === 1);

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-4 space-y-3",
                  isHighlighted ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                {p.badge && (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {p.badge}
                  </Badge>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{p.name}</span>
                  </div>
                  <div>
                    <span className="text-xl font-bold text-foreground">{p.price}€</span>
                    <span className="text-xs text-muted-foreground">/Monat</span>
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => {
                    window.open(p.checkoutUrl, "_blank");
                    onOpenChange(false);
                  }}
                  className="w-full h-11 text-sm gap-2"
                  variant={isHighlighted ? "default" : "secondary"}
                >
                  Jetzt upgraden
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          14 Tage kostenlos testen · Monatlich kündbar · Abrechnung über CopeCart
        </p>
      </DialogContent>
    </Dialog>
  );
}
