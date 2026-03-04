import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, PawPrint, Euro, Users, Link2, 
  ArrowRight, Check, X, ChevronRight, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingAssistantProps {
  onComplete: () => void;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  path: string;
  checkFn?: () => Promise<boolean>;
}

interface GoalOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: SetupStep[];
}

const GOALS: GoalOption[] = [
  {
    id: 'termine',
    icon: <Calendar className="h-5 w-5" />,
    title: '📅 Termine & Touren organisieren',
    description: 'Kalender einrichten und Touren planen',
    steps: [
      { id: 'profile', title: 'Firmenprofil einrichten', description: 'Name, Adresse und Kontaktdaten hinterlegen.', path: '/einstellungen' },
      { id: 'service', title: 'Erste Dienstleistung anlegen', description: 'Definiere deine Leistungen mit Preisen.', path: '/dienstleistungen' },
      { id: 'client', title: 'Ersten Kunden hinzufügen', description: 'Lege deinen ersten Kunden an.', path: '/kunden' },
      { id: 'appointment', title: 'Ersten Termin erstellen', description: 'Plane deinen ersten Besuch im Kalender.', path: '/kalender' },
    ],
  },
  {
    id: 'pferde',
    icon: <PawPrint className="h-5 w-5" />,
    title: '🐴 Pferdeakten digital führen',
    description: 'Pferdeakten anlegen und verwalten',
    steps: [
      { id: 'client', title: 'Ersten Kunden hinzufügen', description: 'Lege den Pferdebesitzer als Kunden an.', path: '/kunden' },
      { id: 'horse', title: 'Erstes Pferd anlegen', description: 'Erstelle die erste digitale Pferdeakte.', path: '/kunden' },
      { id: 'service', title: 'Dienstleistung anlegen', description: 'Definiere deine Leistungen für die Dokumentation.', path: '/dienstleistungen' },
      { id: 'appointment', title: 'Ersten Termin erstellen', description: 'Dokumentiere deinen ersten Besuch.', path: '/kalender' },
    ],
  },
  {
    id: 'rechnungen',
    icon: <Euro className="h-5 w-5" />,
    title: '💶 Rechnungen einfacher stellen',
    description: 'Rechnungssystem einrichten',
    steps: [
      { id: 'profile', title: 'Firmenname einrichten', description: 'Geschäftsdaten für deine Rechnungen hinterlegen.', path: '/einstellungen' },
      { id: 'service', title: 'Erste Dienstleistung anlegen', description: 'Leistung mit Preis für Rechnungen definieren.', path: '/dienstleistungen' },
      { id: 'client', title: 'Ersten Kunden hinzufügen', description: 'Rechnungsempfänger anlegen.', path: '/kunden' },
      { id: 'invoice', title: 'Erste Rechnung erstellen', description: 'Erstelle deine erste professionelle Rechnung.', path: '/rechnungen' },
    ],
  },
  {
    id: 'kunden',
    icon: <Users className="h-5 w-5" />,
    title: '👥 Kunden besser betreuen',
    description: 'Kundenverwaltung und Kommunikation',
    steps: [
      { id: 'profile', title: 'Profil vervollständigen', description: 'Damit Kunden dich erkennen.', path: '/einstellungen' },
      { id: 'client', title: 'Ersten Kunden hinzufügen', description: 'Lege deinen ersten Kunden an.', path: '/kunden' },
      { id: 'horse', title: 'Pferd für den Kunden anlegen', description: 'Verknüpfe ein Pferd mit dem Kunden.', path: '/kunden' },
      { id: 'website', title: 'Buchungsseite aktivieren', description: 'Kunden können direkt bei dir buchen.', path: '/website' },
      { id: 'chat', title: 'Erste Nachricht senden', description: 'Kommuniziere direkt mit deinem Kunden.', path: '/chat' },
    ],
  },
  {
    id: 'vernetzung',
    icon: <Link2 className="h-5 w-5" />,
    title: '🔗 Mit Tierarzt & Team vernetzen',
    description: 'Partner und Team einbinden',
    steps: [
      { id: 'profile', title: 'Profil vervollständigen', description: 'Damit Partner dich finden können.', path: '/einstellungen' },
      { id: 'client', title: 'Ersten Kunden anlegen', description: 'Kunden sind die Basis für Freigaben.', path: '/kunden' },
      { id: 'network', title: 'Partner einladen', description: 'Lade einen Tierarzt oder Hufschmied ein.', path: '/netzwerk' },
    ],
  },
];

const STORAGE_KEY = 'hm_onboarding_goal';
const COMPLETED_STEPS_KEY = 'hm_onboarding_completed_steps';

export function OnboardingAssistant({ onComplete }: OnboardingAssistantProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'goal' | 'steps'>('goal');
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(false);

  // Restore state from localStorage
  useEffect(() => {
    if (!user) return;
    const savedGoal = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    const savedSteps = localStorage.getItem(`${COMPLETED_STEPS_KEY}_${user.id}`);
    
    if (savedGoal) {
      const goal = GOALS.find(g => g.id === savedGoal);
      if (goal) {
        setSelectedGoal(goal);
        setPhase('steps');
      }
    }
    if (savedSteps) {
      try {
        setCompletedSteps(new Set(JSON.parse(savedSteps)));
      } catch {}
    }
  }, [user]);

  const handleGoalSelect = (goal: GoalOption) => {
    setSelectedGoal(goal);
    setPhase('steps');
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, goal.id);
    }
  };

  const handleStepClick = (step: SetupStep) => {
    navigate(step.path);
  };

  const handleStepComplete = (stepId: string) => {
    const next = new Set(completedSteps);
    next.add(stepId);
    setCompletedSteps(next);
    if (user) {
      localStorage.setItem(`${COMPLETED_STEPS_KEY}_${user.id}`, JSON.stringify([...next]));
    }
    
    // Check if all steps done
    if (selectedGoal && next.size >= selectedGoal.steps.length) {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
      localStorage.removeItem(`${COMPLETED_STEPS_KEY}_${user.id}`);
    }
    onComplete();
  };

  const progress = selectedGoal 
    ? Math.round((completedSteps.size / selectedGoal.steps.length) * 100) 
    : 0;

  // Minimized floating button
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg p-0"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
        {selectedGoal && (
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
            {selectedGoal.steps.length - completedSteps.size}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[85vh] overflow-hidden rounded-2xl border bg-card shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">
              {phase === 'goal' ? 'Einrichtungsassistent' : 'Deine Schritte'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(true)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFinish}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {phase === 'goal' ? (
            <div className="space-y-3">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  Was ist dein wichtigstes Ziel?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Wir zeigen dir die passenden Schritte.
                </p>
              </div>

              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalSelect(goal)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {goal.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{goal.title}</p>
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : selectedGoal ? (
            <div className="space-y-3">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedSteps.size} von {selectedGoal.steps.length} erledigt</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Steps */}
              <div className="space-y-2 mt-3">
                {selectedGoal.steps.map((step, i) => {
                  const isDone = completedSteps.has(step.id);
                  return (
                    <div
                      key={`${step.id}-${i}`}
                      className={cn(
                        "rounded-xl border p-3 transition-all",
                        isDone ? "bg-muted/50 border-muted" : "bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isDone 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {isDone ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm",
                            isDone ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          {!isDone && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleStepClick(step)}
                              >
                                Jetzt erledigen
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => handleStepComplete(step.id)}
                              >
                                Überspringen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Change goal */}
              <button
                onClick={() => { setPhase('goal'); setCompletedSteps(new Set()); }}
                className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
              >
                Anderes Ziel wählen
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
