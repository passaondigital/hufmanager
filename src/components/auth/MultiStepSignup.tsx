import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Hammer, Heart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfettiEffect } from "@/components/onboarding/ConfettiEffect";

interface MultiStepSignupProps {
  onComplete: (data: {
    fullName: string;
    role: "provider" | "client";
    email: string;
    password: string;
    businessName?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  inviteCode?: string | null;
}

const STEPS = [
  { id: "name", motivation: "Schön dass du dabei bist." },
  { id: "role", motivation: "HufManager passt sich deiner Arbeit an." },
  { id: "credentials", motivation: "Deine Daten. Deine Kontrolle. Deutsche Server." },
  { id: "business", motivation: "Fast geschafft — gleich bist du drin." },
];

export function MultiStepSignup({ onComplete, onCancel, loading, inviteCode }: MultiStepSignupProps) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"provider" | "client">(inviteCode ? "client" : "provider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  const firstName = fullName.split(" ")[0] || "";

  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length >= 2;
      case 1: return true; // role always selected
      case 2: return email.includes("@") && password.length >= 6;
      case 3: return true; // business name is optional
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      // Skip business name step for clients
      if (step === 2 && role === "client") {
        await handleSubmit();
        return;
      }
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    await onComplete({
      fullName,
      role,
      email,
      password,
      businessName: businessName.trim() || undefined,
    });
    setShowWelcome(true);
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <ConfettiEffect duration={4000} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-bold text-foreground">
              Willkommen, {firstName}! 🎉
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Dein Betrieb wartet — leg los.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold gap-2"
              onClick={onCancel}
            >
              Jetzt starten
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const totalSteps = role === "client" ? 3 : 4;
  const currentStepData = STEPS[step];

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Step 0: Name */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Wie heißt du?</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="sr-only">Vorname & Nachname</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Vorname Nachname"
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 text-lg text-center"
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                />
              </div>
            </div>
          )}

          {/* Step 1: Role */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Was machst du?</h2>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setRole("provider")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[64px]",
                    role === "provider"
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    role === "provider" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Hammer className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Hufbearbeiter</p>
                    <p className="text-sm text-muted-foreground">Termine, Kunden & Rechnungen verwalten</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[64px] relative",
                    role === "client"
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    GRATIS
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    role === "client" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Heart className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Pferdebesitzer</p>
                    <p className="text-sm text-muted-foreground">Pferdeakte einsehen & Termine buchen</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Email & Password */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Dein Zugang</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">E-Mail</Label>
                  <Input
                    id="s-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-[52px] text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-pw">Passwort</Label>
                  <Input
                    id="s-pw"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[52px] text-base"
                    onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Business Name (providers only) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Dein Betrieb</h2>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-biz">Betriebsname (optional)</Label>
                <Input
                  id="s-biz"
                  type="text"
                  placeholder="z.B. Hufservice Müller"
                  autoFocus
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-[52px] text-base"
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
                <p className="text-xs text-muted-foreground">
                  Erscheint auf deiner Seite. Du kannst das später ändern.
                </p>
              </div>
            </div>
          )}

          {/* Motivational text */}
          <p className="text-sm text-muted-foreground text-center">
            {currentStepData.motivation}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="min-h-[52px]"
          >
            Zurück
          </Button>
        )}
        <Button
          className="flex-1 h-14 text-base font-semibold gap-2"
          disabled={!canProceed() || loading}
          onClick={handleNext}
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {step === (role === "client" ? 2 : 3) ? "Registrieren" : "Weiter"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>

      {/* Cancel link */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm text-muted-foreground hover:text-foreground text-center min-h-[44px]"
      >
        Ich habe schon ein Konto → Anmelden
      </button>
    </div>
  );
}
