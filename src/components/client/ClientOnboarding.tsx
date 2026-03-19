import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { ClientModeSettings } from "./ClientModeSettings";

interface ClientOnboardingProps {
  onComplete: () => void;
}

const infoScreens = [
  {
    emoji: "🐴📱",
    title: "Willkommen in deinem Pferdeportal 🐴",
    text: "Hier findest du alles rund um dein Pferd — Termine, Befunde, Fotos und Rechnungen. Alles an einem Ort, immer dabei.",
  },
  {
    emoji: "📅✅",
    title: "Dein Hufpfleger ist verbunden",
    text: "Nach jedem Termin siehst du hier den Befund und Fotos deines Pferdes. Rechnungen kommen direkt aufs Handy.",
  },
  {
    emoji: "💬",
    title: "Fragen? Einfach schreiben.",
    text: "Schreib deinem Hufpfleger direkt — kein Telefonieren, kein WhatsApp hin und her. Alles läuft über HufManager.",
  },
];

// Total steps: info screens + mode selection
const TOTAL_STEPS = infoScreens.length + 1;

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const [step, setStep] = useState(0);
  const isModeStep = step === infoScreens.length;
  const isInfoStep = step < infoScreens.length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isInfoStep && (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <div className="text-6xl mb-6">{infoScreens[step].emoji}</div>
            <h2 className="text-2xl font-bold text-foreground mb-4">{infoScreens[step].title}</h2>
            <p className="text-muted-foreground text-base leading-relaxed">{infoScreens[step].text}</p>
          </motion.div>
        )}

        {isModeStep && (
          <motion.div
            key="mode-select"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <ClientModeSettings variant="onboarding" onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {isInfoStep && (
        <div className="mt-12 w-full max-w-sm">
          <Button
            onClick={() => setStep(step + 1)}
            className="w-full h-14 text-lg gap-2"
            size="lg"
          >
            Weiter
            <ChevronRight className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            className="w-full mt-2 text-muted-foreground"
            onClick={onComplete}
          >
            Überspringen
          </Button>
        </div>
      )}
    </div>
  );
}
