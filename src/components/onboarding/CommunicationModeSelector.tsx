import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, Zap, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CommunicationModeSelectorProps {
  onSelect: (mode: "whatsapp" | "hufmanager", whatsappNumber?: string) => Promise<void>;
  onSkip?: () => void;
  /** Compact mode for settings page (no skip, smaller tiles) */
  compact?: boolean;
  currentMode?: "whatsapp" | "hufmanager" | "not_set";
  currentNumber?: string | null;
}

export function CommunicationModeSelector({
  onSelect,
  onSkip,
  compact = false,
  currentMode,
  currentNumber,
}: CommunicationModeSelectorProps) {
  const [selected, setSelected] = useState<"whatsapp" | "hufmanager" | null>(
    currentMode && currentMode !== "not_set" ? currentMode : null
  );
  const [whatsappNumber, setWhatsappNumber] = useState(currentNumber || "");
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (mode: "whatsapp" | "hufmanager") => {
    setSelected(mode);
    if (mode === "whatsapp") {
      setShowNumberInput(true);
      setConfirmed(false);
    } else {
      setShowNumberInput(false);
      setConfirmed(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      if (selected === "whatsapp") {
        // Clean number
        let num = whatsappNumber.trim().replace(/\s/g, "");
        if (num.startsWith("0")) num = "+49" + num.slice(1);
        if (!num.startsWith("+")) num = "+49" + num;
        await onSelect("whatsapp", num);
      } else {
        await onSelect("hufmanager");
      }
      setConfirmed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNumberValid = whatsappNumber.trim().length >= 6;

  return (
    <div className={cn("w-full", compact ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      {!compact && (
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            💬 Wie kommunizierst du mit deinen Kunden?
          </h2>
          <p className="text-muted-foreground text-sm">
            Wähle deinen bevorzugten Weg. Du kannst das jederzeit ändern.
          </p>
        </div>
      )}

      {/* Confirmed state */}
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-3"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              {selected === "whatsapp"
                ? "WhatsApp ist aktiviert! 🟢"
                : "HufManager Chat ist aktiviert! 🐴"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selected === "whatsapp"
                ? `Deine Kunden erreichen dich unter ${whatsappNumber}`
                : "Deine Kunden können dir direkt in der App schreiben."}
            </p>
          </motion.div>
        ) : (
          <motion.div key="selection" className="space-y-4">
            {/* Tiles */}
            <div className={cn(
              "grid gap-4",
              compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
            )}>
              {/* WhatsApp Tile */}
              <button
                type="button"
                onClick={() => handleSelect("whatsapp")}
                className={cn(
                  "relative rounded-xl border-2 p-5 text-left transition-all duration-200",
                  "hover:shadow-md hover:border-primary/50",
                  selected === "whatsapp"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card"
                )}
              >
                {selected === "whatsapp" && (
                  <div className="absolute top-3 right-3">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <span className="text-2xl">🟢</span>
                  <h3 className="font-bold text-foreground">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Deine Kunden kennen es bereits. Keine neue App nötig.
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-primary shrink-0" /> Vertraut
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-primary shrink-0" /> Schnell
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-primary shrink-0" /> Kostenlos
                    </li>
                  </ul>
                </div>
              </button>

              {/* HufManager Tile */}
              <button
                type="button"
                onClick={() => handleSelect("hufmanager")}
                className={cn(
                  "relative rounded-xl border-2 p-5 text-left transition-all duration-200",
                  "hover:shadow-md hover:border-primary/50",
                  selected === "hufmanager"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card"
                )}
              >
                {selected === "hufmanager" && (
                  <div className="absolute top-3 right-3">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <span className="text-2xl">🐴</span>
                  <h3 className="font-bold text-foreground">HufManager Chat</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Alles an einem Ort – Termine, Dokumente, Nachrichten direkt teilbar.
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-primary shrink-0" /> Professionell
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-primary shrink-0" /> Datenschutz
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-primary shrink-0" /> Alles in 1
                    </li>
                  </ul>
                </div>
              </button>
            </div>

            {/* WhatsApp Number Input */}
            <AnimatePresence>
              {showNumberInput && selected === "whatsapp" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <Label htmlFor="wa-number" className="text-sm font-medium">
                      Deine WhatsApp-Nummer:
                    </Label>
                    <Input
                      id="wa-number"
                      type="tel"
                      placeholder="+49 176 12345678"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Diese Nummer sehen deine Kunden wenn sie dich kontaktieren.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm Button */}
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <Button
                  onClick={handleConfirm}
                  disabled={
                    isSubmitting ||
                    (selected === "whatsapp" && !isNumberValid)
                  }
                  className="w-full sm:w-auto min-w-[200px]"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Bestätigen
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Skip */}
            {onSkip && !compact && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Später entscheiden
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
