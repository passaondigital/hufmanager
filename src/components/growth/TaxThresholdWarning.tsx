import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useDachConfig } from "@/hooks/useDachConfig";

interface TaxThresholdWarningProps {
  annualRevenue: number;
}

const STORAGE_KEY = "hm_tax_warning_dismissed_";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const thresholds = {
  DE: {
    limit: 25000,
    warningAt: 20000,
    message: (rev: string) =>
      `Achtung: Du näherst dich der Kleinunternehmergrenze (${rev} Jahresumsatz). Ab 25.000€ wechselst du in die Regelbesteuerung. Bitte informiere deinen Steuerberater.`,
  },
  AT: {
    limit: 35000,
    warningAt: 28000,
    message: (rev: string) =>
      `Achtung: Kleinunternehmergrenze in Österreich: 35.000€ netto. Dein aktueller Jahresumsatz: ${rev}. Bitte prüfe deinen Status.`,
  },
  CH: {
    limit: 100000,
    warningAt: 80000,
    message: (rev: string) =>
      `In der Schweiz bist du ab CHF 100'000 Jahresumsatz MWST-pflichtig. Dein aktueller Umsatz: ${rev}. Bitte wende dich an die ESTV.`,
  },
};

export function TaxThresholdWarning({ annualRevenue }: TaxThresholdWarningProps) {
  const { country, formatCurrency } = useDachConfig();
  const [visible, setVisible] = useState(false);

  const config = thresholds[country];
  const storageKey = STORAGE_KEY + country;

  useEffect(() => {
    if (!config || annualRevenue < config.warningAt) return;

    const lastDismissed = localStorage.getItem(storageKey);
    if (lastDismissed && Date.now() - Number(lastDismissed) < COOLDOWN_MS) return;

    setVisible(true);
  }, [annualRevenue, country]);

  const dismiss = () => {
    localStorage.setItem(storageKey, String(Date.now()));
    setVisible(false);
  };

  if (!config || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Steuerliche Schwelle</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {config.message(formatCurrency(annualRevenue))}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Bitte konsultiere deinen Steuerberater. HufManager gibt keine Rechtsberatung.
              </p>
            </div>
            <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
