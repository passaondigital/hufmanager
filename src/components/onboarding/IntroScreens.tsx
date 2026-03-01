import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Monitor, WifiOff, Wifi, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntroScreensProps {
  onComplete: () => void;
}

const screens = [
  {
    icon: Monitor,
    emoji: "🏠",
    title: "Das ist dein Cockpit.",
    description: "Termine, Kunden, Rechnungen — alles auf einen Blick. Direkt loslegen, ohne Handbuch.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: WifiOff,
    emoji: "📡",
    title: "Alles läuft auch ohne Internet.",
    description: "Im Stall, auf der Koppel, ohne Empfang — du arbeitest weiter. Daten werden synchronisiert, sobald du wieder online bist.",
    accent: "from-green-500/20 to-green-500/5",
  },
  {
    icon: Users,
    emoji: "📱",
    title: "Deine Kunden bekommen ihre eigene App — kostenlos.",
    description: "Pferdeakte, Termine, Befunde — deine Kunden sehen alles. Professionell und transparent.",
    accent: "from-blue-500/20 to-blue-500/5",
  },
];

export function IntroScreens({ onComplete }: IntroScreensProps) {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    if (current < screens.length - 1) {
      setCurrent(current + 1);
    } else {
      onComplete();
    }
  };

  const screen = screens[current];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Progress Dots */}
      <div className="flex items-center gap-2 mb-8">
        {screens.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === current ? "w-8 bg-primary" : i < current ? "w-2 bg-primary/60" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col items-center justify-center max-w-sm text-center"
        >
          {/* Illustration area */}
          <div className={cn(
            "w-32 h-32 rounded-3xl bg-gradient-to-br flex items-center justify-center mb-8",
            screen.accent
          )}>
            <span className="text-6xl">{screen.emoji}</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-3">{screen.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{screen.description}</p>

          {/* Offline animation for screen 2 */}
          {current === 1 && (
            <motion.div className="flex items-center gap-3 mt-6 p-3 rounded-xl bg-muted/50 border border-border">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <WifiOff className="h-5 w-5 text-destructive" />
              </motion.div>
              <span className="text-sm text-muted-foreground">→</span>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wifi className="h-5 w-5 text-green-500" />
              </motion.div>
              <span className="text-sm text-muted-foreground">Automatisch synchronisiert</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 mt-8">
        <Button
          onClick={handleNext}
          className="w-full h-14 text-base font-semibold gap-2"
        >
          {current < screens.length - 1 ? "Weiter" : "Loslegen!"}
          <ChevronRight className="h-5 w-5" />
        </Button>
        <button
          type="button"
          onClick={onComplete}
          className="w-full text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          Überspringen
        </button>
      </div>
    </div>
  );
}
