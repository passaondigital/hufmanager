import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

interface ClientOnboardingProps {
  onComplete: () => void;
}

const screens = [
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

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === screens.length - 1;
  const screen = screens[step];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {screens.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className="text-6xl mb-6">{screen.emoji}</div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{screen.title}</h2>
          <p className="text-muted-foreground text-base leading-relaxed">{screen.text}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 w-full max-w-sm">
        <Button
          onClick={() => {
            if (isLast) {
              onComplete();
            } else {
              setStep(step + 1);
            }
          }}
          className="w-full h-14 text-lg gap-2"
          size="lg"
        >
          {isLast ? (
            <>
              <Sparkles className="h-5 w-5" />
              Los geht's! 🎉
            </>
          ) : (
            <>
              Weiter
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </Button>

        {!isLast && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-muted-foreground"
            onClick={onComplete}
          >
            Überspringen
          </Button>
        )}
      </div>
    </div>
  );
}
