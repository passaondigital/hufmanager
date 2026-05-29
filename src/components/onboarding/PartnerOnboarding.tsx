import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Heart, FileText, MessageSquare, Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PartnerOnboardingProps {
  onComplete: () => void;
}

const SPECIALTIES = [
  "Osteopath/in",
  "Physiotherapeut/in",
  "Tierarzt/Tierärztin",
  "Dentist/in",
  "Sattler/in",
  "Tierheilpraktiker/in",
  "Sonstige",
];

const TOUR_STEPS = [
  { icon: Heart, title: "Meine Pferde", desc: "Pferde für die du Zugriff hast" },
  { icon: FileText, title: "Behandlungsnotiz", desc: "Dokumentiere deine Befunde strukturiert" },
  { icon: MessageSquare, title: "Empfehlung", desc: "Schreibe Empfehlungen an den Hufbearbeiter" },
];

export function PartnerOnboarding({ onComplete }: PartnerOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");

  const finish = async () => {
    if (!user) return;
    try {
      const updates: Record<string, unknown> = { onboarding_completed: true };
      if (city) updates.city = city;
      await supabase.from("profiles").update(updates).eq("id", user.id);
    } catch {}
    onComplete();
  };

  const steps = [
    // Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Stethoscope className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Willkommen im Hufi-Netzwerk!</h2>
      <p className="text-muted-foreground">Dokumentiere deine Befunde digital.</p>
      <Button onClick={() => setStep(1)} className="gap-2">
        Los geht's <ChevronRight className="h-4 w-4" />
      </Button>
    </div>,

    // Profile
    <div key="profile" className="space-y-5">
      <h2 className="text-xl font-bold text-foreground text-center">Dein Profil</h2>
      <div className="space-y-3">
        <div>
          <Label>Fachrichtung</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="city">Stadt</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="z.B. Düsseldorf" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Später</Button>
        <Button className="flex-1" onClick={() => setStep(2)}>Weiter</Button>
      </div>
    </div>,

    // Connect
    <div key="connect" className="space-y-6 text-center">
      <h2 className="text-xl font-bold text-foreground">Pferd verbinden</h2>
      <p className="text-sm text-muted-foreground">
        Wenn ein Pferdebesitzer dich eingeladen hat, siehst du sein Pferd automatisch hier.
      </p>
      <Button onClick={() => setStep(3)} className="w-full">Weiter</Button>
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
      <Button onClick={finish} className="w-full">Fertig! 🎉</Button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex gap-1.5 mb-6 px-4">
          {[0, 1, 2, 3].map((i) => (
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
