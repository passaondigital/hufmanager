import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface UpgradeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  benefit: string;
  requiredPlan?: string;
  price?: string;
}

export function UpgradeBottomSheet({
  open,
  onClose,
  featureName,
  benefit,
  requiredPlan = "Pro",
  price = "29€/Monat",
}: UpgradeBottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-6 pb-8 max-w-lg mx-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-2"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Das gibt's im {requiredPlan}-Plan
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {benefit}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-5">
              Ab {price} · Monatlich kündbar · 14 Tage kostenlos testen
            </p>

            <div className="space-y-2">
              <Button
                className="w-full h-14 text-base font-semibold"
                onClick={() => window.open("/preise", "_blank")}
              >
                14 Tage gratis testen →
              </Button>
              <button
                onClick={onClose}
                className="w-full text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
              >
                Später
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
