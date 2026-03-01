import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface FeatureHint {
  id: string;
  title: string;
  description: string;
  cta: string;
  navigateTo: string;
  requiredDaysActive: number;
  /** localStorage key that, if present, means user already uses this feature */
  usageKey?: string;
}

const featureHints: FeatureHint[] = [
  {
    id: "hufcam",
    title: "Huffotos direkt in die Akte",
    description: "Mit HufCam speicherst du Huffotos direkt in der Pferdeakte — inklusive Datum und Verlauf. Perfekt für Vorher-Nachher-Vergleiche.",
    cta: "Jetzt ausprobieren",
    navigateTo: "/huf-analyse",
    requiredDaysActive: 7,
  },
  {
    id: "autoflow",
    title: "Termine, Rechnungen, Erinnerungen — automatisch",
    description: "AutoFlow erledigt die Routinearbeit für dich. Termin erledigt → Rechnung raus → Erinnerung an den nächsten Termin.",
    cta: "AutoFlow entdecken",
    navigateTo: "/autoflow",
    requiredDaysActive: 14,
  },
  {
    id: "calendar-sync",
    title: "Kalender mit dem Handy synchronisieren",
    description: "Exportiere deine HufManager-Termine in deinen iPhone- oder Google-Kalender. Alle Termine immer dabei.",
    cta: "Kalender verbinden",
    navigateTo: "/calendar",
    requiredDaysActive: 5,
  },
  {
    id: "website",
    title: "Deine eigene Webseite — kostenlos",
    description: "HufManager erstellt automatisch eine professionelle Webseite für dich. Kunden können dort direkt Termine anfragen.",
    cta: "Webseite ansehen",
    navigateTo: "/website",
    requiredDaysActive: 10,
  },
];

const STORAGE_PREFIX = "hm_hint_dismissed_";
const LAST_HINT_KEY = "hm_last_hint_shown";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const FeatureDiscoveryHint = () => {
  const [activeHint, setActiveHint] = useState<FeatureHint | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const lastShown = localStorage.getItem(LAST_HINT_KEY);
    if (lastShown && Date.now() - Number(lastShown) < COOLDOWN_MS) return;

    const registeredAt = localStorage.getItem("hm_registered_at");
    const daysActive = registeredAt
      ? Math.floor((Date.now() - Number(registeredAt)) / (1000 * 60 * 60 * 24))
      : 0;

    const eligible = featureHints.find(
      (h) =>
        daysActive >= h.requiredDaysActive &&
        !localStorage.getItem(STORAGE_PREFIX + h.id)
    );

    if (eligible) {
      setActiveHint(eligible);
      localStorage.setItem(LAST_HINT_KEY, String(Date.now()));
    }
  }, []);

  const dismiss = () => {
    if (activeHint) {
      localStorage.setItem(STORAGE_PREFIX + activeHint.id, String(Date.now()));
    }
    setActiveHint(null);
  };

  return (
    <AnimatePresence>
      {activeHint && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="rounded-lg border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary mb-0.5">Wusstest du?</p>
              <p className="text-sm font-semibold text-foreground">{activeHint.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {activeHint.description}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs h-8"
                onClick={() => { dismiss(); navigate(activeHint.navigateTo); }}
              >
                {activeHint.cta}
              </Button>
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
