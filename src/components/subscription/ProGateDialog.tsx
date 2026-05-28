import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { WiderrufsausschlussCheckbox } from "@/components/consent/WiderrufsausschlussCheckbox";
import { logConsent } from "@/lib/consent";

const PRO_CHECKOUT_URL =
  "https://www.copecart.com/products/1996da6f/checkout?utm_source=app&utm_medium=feature-lock&utm_campaign=pro-gate";

interface ProGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function ProGateDialog({
  open,
  onOpenChange,
  featureName = "Diese Funktion",
}: ProGateDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(false);

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setAccepted(false);
      setError(false);
    }
  };

  const handleUpgrade = async () => {
    if (!accepted) {
      setError(true);
      return;
    }
    await logConsent("widerrufsausschluss");
    window.open(PRO_CHECKOUT_URL, "_blank");
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>HufManager Pro</DialogTitle>
          </div>
          <DialogDescription>
            {featureName} ist in HufManager Pro enthalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {[
              "Kunden per WhatsApp, E-Mail oder Link einladen",
              "Kostenlose Kunden-App für Pferdebesitzer",
              "Bis zu 75 Pferde verwalten",
              "AutoFlow, HM Connect & Netzwerk",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <WiderrufsausschlussCheckbox
            checked={accepted}
            onCheckedChange={(v) => {
              setAccepted(v);
              if (v) setError(false);
            }}
            error={error}
          />

          <Button onClick={handleUpgrade} className="w-full gap-2 min-h-[48px] font-semibold">
            Jetzt auf Pro upgraden
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Abrechnung über Copecart. Monatlich kündbar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
