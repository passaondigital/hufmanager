import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ClipboardList, Clock, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeOnboardingProps {
  onComplete: () => void;
  providerName?: string;
}

const TOUR_STEPS = [
  { icon: ClipboardList, title: "Meine Aufträge", desc: "Deine zugewiesenen Termine" },
  { icon: Clock, title: "Check-in", desc: "Starte deinen Arbeitstag" },
  { icon: Camera, title: "Dokumentation", desc: "Fotos + Notizen pro Pferd" },
];

export function EmployeeOnboarding({ onComplete, providerName }: EmployeeOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const finish = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    } catch {}
    onComplete();
  };

  const steps = [
    // Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">
        {providerName ? `${providerName} hat dich eingeladen!` : "Willkommen im Team!"}
      </h2>
      <p className="text-muted-foreground">Hier siehst du deine zugewiesenen Aufträge.</p>
      <Button onClick={() => setStep(1)} className="gap-2">
        Los geht's <ChevronRight className="h-4 w-4" />
      </Button>
    </div>,

    // Check-in explanation
    <div key="checkin" className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Clock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Check-in verstehen</h2>
      <p className="text-sm text-muted-foreground">
        Vor jedem Termin: Check-in. Nach dem Termin: Check-out + Doku.
      </p>
      <Button onClick={() => setStep(2)}>Verstanden ✓</Button>
    </div>,

    // Tour
    <div key="tour" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Kurz-Tour</h2>
      <div className="space-y-3">
        {TOUR_STEPS.map((ts, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ts.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{ts.title}</p>
                <p className="text-xs text-muted-foreground">{ts.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={finish} className="w-full">Fertig – Loslegen! 🎉</Button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex gap-1.5 mb-6 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <Card><CardContent className="p-6">{steps[step]}</CardContent></Card>
          </motion.div>
        </AnimatePresence>
        <button onClick={finish} className="mt-4 text-xs text-muted-foreground hover:text-foreground mx-auto block">Überspringen</button>
      </div>
    </div>
  );
}
