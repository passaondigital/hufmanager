import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfettiEffect } from './ConfettiEffect';

interface SetupCompleteScreenProps {
  displayName: string;
  onContinue: () => void;
}

export function SetupCompleteScreen({ displayName, onContinue }: SetupCompleteScreenProps) {
  return (
    <>
      <ConfettiEffect />
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-full max-w-md text-center space-y-8"
        >
          {/* Trophy icon */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <span className="text-6xl">🏆</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold text-foreground">
              Du bist startklar!
            </h1>
            <p className="text-lg text-muted-foreground">
              Perfekt, {displayName}. Dein HufManager ist eingerichtet 
              und bereit für den ersten Einsatz.
            </p>
          </motion.div>

          {/* Quick tips */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-muted/30 rounded-xl p-4 text-left space-y-2"
          >
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Was als nächstes?
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-6">
              <li>• Starte die <strong>Führung</strong> im Dashboard für einen Überblick</li>
              <li>• Plane deinen <strong>ersten Termin</strong> im Kalender</li>
              <li>• Lade Kunden über den <strong>Einladungslink</strong> ein</li>
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <Button
              size="lg"
              onClick={onContinue}
              className="gap-2 h-14 px-8 text-lg font-semibold"
            >
              Los geht's
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
