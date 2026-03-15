import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FeatureHintProps {
  /** Unique hint ID for dismissal tracking */
  id: string;
  /** Hint message text */
  text: string;
  /** Only show once per user – dismissed via localStorage */
  dismissible?: boolean;
}

const STORAGE_PREFIX = "hm_feature_hint_";

/**
 * Contextual hint shown inline to connect features.
 * Shows once per user, dismissible. Max 1 per page visit is handled
 * by consumer components (only render 1 FeatureHint per view).
 */
export function FeatureHint({ id, text, dismissible = true }: FeatureHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dismissible && localStorage.getItem(STORAGE_PREFIX + id)) return;
    // Small delay for smooth appearance
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [id, dismissible]);

  const dismiss = () => {
    if (dismissible) {
      localStorage.setItem(STORAGE_PREFIX + id, "1");
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 mb-3"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
              <span className="font-medium text-foreground">Tipp: </span>
              {text}
            </p>
            {dismissible && (
              <button
                onClick={dismiss}
                className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Hinweis schließen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
