import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeHintProps {
  featureName: string;
  benefit: string;
  requiredPlan?: string;
}

const STORAGE_PREFIX = "hm_upgrade_dismissed_";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export const UpgradeHint = ({ featureName, benefit, requiredPlan = "Pro" }: UpgradeHintProps) => {
  const storageKey = STORAGE_PREFIX + featureName.replace(/\s/g, "_").toLowerCase();
  const lastDismissed = localStorage.getItem(storageKey);
  const shouldShow = !lastDismissed || Date.now() - Number(lastDismissed) > COOLDOWN_MS;

  const [visible, setVisible] = useState(shouldShow);

  const dismiss = () => {
    localStorage.setItem(storageKey, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {featureName} — verfügbar im {requiredPlan}-Plan
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{benefit}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="text-xs h-8" onClick={() => window.open("/preise", "_blank")}>
                  14 Tage kostenlos testen →
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-8 text-muted-foreground" onClick={dismiss}>
                  Später
                </Button>
              </div>
            </div>
            <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
