import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, Smartphone } from "lucide-react";

// CopeCart-Produkt-URL für HufManager Pro (€19,90/Monat)
const PRO_CHECKOUT_URL =
  "https://www.copecart.com/products/953da638/checkout?utm_source=app&utm_medium=upgrade&utm_campaign=clientapp";

interface ClientAppUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientAppUpgradeModal({ open, onOpenChange }: ClientAppUpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl flex items-center gap-2">
            HufManager Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Die Kundenapp ist in HufManager Pro enthalten. Deine Kunden können
              ihre Pferdeakte einsehen, Termine buchen und Rechnungen empfangen.
            </p>
          </div>

          <Button
            className="w-full h-11 gap-2"
            onClick={() => {
              window.open(PRO_CHECKOUT_URL, "_blank");
              onOpenChange(false);
            }}
          >
            Jetzt upgraden → €19,90/Monat
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
