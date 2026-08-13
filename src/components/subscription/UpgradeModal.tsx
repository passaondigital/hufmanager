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
import { Lock, Check, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { WiderrufsausschlussCheckbox } from "@/components/consent/WiderrufsausschlussCheckbox";
import { logConsent } from "@/lib/consent";
import { HUFMANAGER_SLIM_TEXT } from "@/config/subscriptionPlans";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPlan?: "advanced" | "pro";
}

const PLANS = [
  {
    id: "pro",
    name: HUFMANAGER_SLIM_TEXT.productName,
    price: "19,95",
    icon: Sparkles,
    badge: HUFMANAGER_SLIM_TEXT.tariffName,
    features: HUFMANAGER_SLIM_TEXT.included.slice(0, 4),
    checkoutUrl: HUFMANAGER_SLIM_TEXT.checkoutUrl || "",
  },
];

export function UpgradeModal({ open, onOpenChange, featureName, requiredPlan = "pro" }: UpgradeModalProps) {
  const [widerrufAccepted, setWiderrufAccepted] = useState(false);
  const [widerrufError, setWiderrufError] = useState(false);

  const upgradePlans = PLANS;

  const handleUpgrade = async (checkoutUrl: string) => {
    if (!widerrufAccepted) {
      setWiderrufError(true);
      return;
    }

    await logConsent("widerrufsausschluss");
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setWiderrufAccepted(false); setWiderrufError(false); } }}>
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
                  onClick={() => handleUpgrade(p.checkoutUrl)}
                  disabled={!p.checkoutUrl}
                  className="w-full h-11 text-sm gap-2"
                  variant={isHighlighted ? "default" : "secondary"}
                >
                  {p.checkoutUrl ? "Jetzt HufManager buchen" : "Checkout nach CopeCart-Anlage"}
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

        <p className="text-center text-xs text-muted-foreground">
          {HUFMANAGER_SLIM_TEXT.productUrl} · {HUFMANAGER_SLIM_TEXT.supportEmail}
        </p>
      </DialogContent>
    </Dialog>
  );
}
