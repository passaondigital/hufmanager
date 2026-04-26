import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Heart, Users, Calendar, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientOnboardingProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  { icon: Heart, title: "Meine Pferde", desc: "Alle deine Pferde auf einen Blick" },
  { icon: BookOpen, title: "Pferdeakte", desc: "Termine, Befunde, Impfungen – alles hier" },
  { icon: Users, title: "Team", desc: "Bestimme wer Zugriff hat" },
  { icon: Calendar, title: "Buchen", desc: "Frage einen Termin an" },
];

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [horseName, setHorseName] = useState("");
  const [providerPid, setProviderPid] = useState("");
  const [tourStep, setTourStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateHorse = async () => {
    if (!horseName.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("horses").insert({
        name: horseName.trim(),
        owner_id: user.id,
      });
      if (error) throw error;
      toast.success(`${horseName} wurde angelegt!`);
      setStep(2);
    } catch (e) {
      toast.error("Fehler beim Anlegen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finish = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    } catch {}
    onComplete();
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">
        Willkommen bei Hufi!
      </h2>
      <p className="text-muted-foreground max-w-sm mx-auto">
        Hier hast du alles zu deinem Pferd im Blick.
      </p>
      <Button onClick={() => setStep(1)} className="gap-2">
        Los geht's <ChevronRight className="h-4 w-4" />
      </Button>
    </div>,

    // Step 1: Create horse
    <div key="horse" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Dein erstes Pferd</h2>
      <p className="text-sm text-muted-foreground text-center">
        Lege dein erstes Pferd an. Je mehr Infos, desto besser kann dein Hufbearbeiter helfen.
      </p>
      <div className="space-y-3">
        <div>
          <Label htmlFor="horse-name">Pferd-Name *</Label>
          <Input id="horse-name" value={horseName} onChange={(e) => setHorseName(e.target.value)} placeholder="z.B. Stella" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Später</Button>
        <Button className="flex-1" onClick={handleCreateHorse} disabled={!horseName.trim() || isSubmitting}>
          Pferd anlegen
        </Button>
      </div>
    </div>,

    // Step 2: Connect provider
    <div key="provider" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Hufbearbeiter verbinden</h2>
      <p className="text-sm text-muted-foreground text-center">
        Hat dein Hufbearbeiter eine Hufi-ID? Dann verbinde euch jetzt.
      </p>
      <div>
        <Label htmlFor="pid">#PID eingeben</Label>
        <Input id="pid" value={providerPid} onChange={(e) => setProviderPid(e.target.value)} placeholder="z.B. #HM-1234" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Später</Button>
        <Button className="flex-1" onClick={() => setStep(3)}>
          Verbinden
        </Button>
      </div>
    </div>,

    // Step 3: Quick tour
    <div key="tour" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Kurz-Tour</h2>
      <div className="grid grid-cols-2 gap-3">
        {TOUR_STEPS.map((ts, i) => (
          <Card key={i} className={cn("transition-all", tourStep === i && "ring-2 ring-primary")}>
            <CardContent className="p-4 text-center">
              <ts.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">{ts.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{ts.desc}</p>
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
        {/* Progress */}
        <div className="flex gap-1.5 mb-6 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">{steps[step]}</CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <button onClick={finish} className="mt-4 text-xs text-muted-foreground hover:text-foreground mx-auto block">
          Onboarding überspringen
        </button>
      </div>
    </div>
  );
}
