import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Hammer, Heart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfettiEffect } from "@/components/onboarding/ConfettiEffect";
import { DACH_COUNTRIES, type DachCountry } from "@/lib/dach";
import { WiderrufsausschlussCheckbox } from "@/components/consent/WiderrufsausschlussCheckbox";
import { ClientTypeSelection, type ClientType } from "@/components/auth/ClientTypeSelection";
import { useHufiTTS } from "@/hooks/useHufiTTS";

type Salutation = "herr" | "frau" | "divers" | "none";

interface MultiStepSignupProps {
  onComplete: (data: {
    fullName: string;
    role: "provider" | "client";
    email: string;
    password: string;
    country: DachCountry;
    businessName?: string;
    clientType?: ClientType;
    professionType?: string;
    salutation?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  inviteCode?: string | null;
}

interface ProfessionOption {
  value: string;
  label: string;
  emoji: string;
  description: string;
}

const PROFESSIONS: ProfessionOption[] = [
  { value: "hoof_care",       label: "Hufbearbeiter",     emoji: "🐴", description: "Barhuf, Beschlag, Kleben" },
  { value: "osteopath",       label: "Osteopath",          emoji: "🦴", description: "Pferdeosteopathie" },
  { value: "physiotherapist", label: "Physiotherapeut",    emoji: "💆", description: "Pferdephysiotherapie" },
  { value: "dentist",         label: "Equine Dentist",     emoji: "🦷", description: "Pferdezahnbehandlung" },
  { value: "riding_instructor", label: "Reitlehrer",       emoji: "🏇", description: "Reitunterricht & Beritt" },
  { value: "saddler",         label: "Sattler",            emoji: "🪡", description: "Sattelanpassung & Reparatur" },
  { value: "massage",         label: "Massage",            emoji: "💬", description: "Pferdemassage & Wellness" },
  { value: "vet_mobile",      label: "Mobiler Tierarzt",   emoji: "🩺", description: "Veterinärmedizin vor Ort" },
  { value: "other",           label: "Sonstiges",          emoji: "⚙️", description: "Andere mobile Dienstleistung" },
];

// 0=name 1=role 2=profession 3=client-type 4=country 5=credentials 6=business 7=salutation
const STEPS = [
  { id: "name",        motivation: "Schön dass du dabei bist." },
  { id: "role",        motivation: "Hufi passt sich deiner Rolle an." },
  { id: "profession",  motivation: "Wir richten deine Service-Presets und Zeitpuffer passend ein." },
  { id: "client-type", motivation: "Damit wir dir die richtigen Features zeigen." },
  { id: "country",     motivation: "Steuerrecht, Währung & Sprache — automatisch korrekt." },
  { id: "credentials", motivation: "Deine Daten. Deine Kontrolle. Deutsche Server." },
  { id: "business",    motivation: "Fast geschafft — gleich bist du drin." },
  { id: "salutation",  motivation: "So kann ich dich persönlich ansprechen." },
];

const HUFI_VOICE: Record<string, string> = {
  name:          "Wie heißt du?",
  salutation:    "Wie möchtest du angesprochen werden?",
  role:          "Ich passe mich deiner Rolle an.",
  profession:    "Welchen Beruf machst du mit Pferden?",
  "client-type": "Privat oder gewerblich?",
  country:       "In welchem Land arbeitest du?",
  credentials:   "Deine Daten bleiben sicher auf deutschen Servern.",
  business:      "Wie heißt dein Betrieb?",
};

const SALUTATION_OPTIONS = [
  { value: "herr",   label: "Herr",         emoji: "👔" },
  { value: "frau",   label: "Frau",         emoji: "👗" },
  { value: "divers", label: "Divers",       emoji: "✨" },
  { value: "none",   label: "Keine Angabe", emoji: "🙂" },
] as const;

export function MultiStepSignup({ onComplete, onCancel, loading, inviteCode }: MultiStepSignupProps) {
  const { speak, isSupported } = useHufiTTS();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [salutation, setSalutation] = useState<Salutation>("none");
  const [role, setRole] = useState<"provider" | "client">(inviteCode ? "client" : "provider");
  const [professionType, setProfessionType] = useState<string>("");
  const [country, setCountry] = useState<DachCountry>("DE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [clientType, setClientType] = useState<ClientType>("private");
  const [showWelcome, setShowWelcome] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [widerrufAccepted, setWiderrufAccepted] = useState(false);
  const [widerrufError, setWiderrufError] = useState(false);
  const prevStepRef = useRef(-1);

  const firstName = fullName.split(" ")[0] || "";

  const getStepSequence = () => {
    if (role === "provider") {
      // name → salutation → role → profession → country → credentials → business
      return [0, 7, 1, 2, 4, 5, 6];
    }
    // client: name → salutation → role → client-type → country → credentials
    return [0, 7, 1, 3, 4, 5];
  };

  const stepSequence = getStepSequence();
  const currentLogicalStep = stepSequence[step] ?? 0;
  const maxStep = stepSequence.length - 1;
  const currentStepData = STEPS[currentLogicalStep];

  useEffect(() => {
    if (!isSupported) return;
    if (step <= prevStepRef.current) {
      prevStepRef.current = step;
      return;
    }
    prevStepRef.current = step;
    const line = HUFI_VOICE[currentStepData?.id ?? ""];
    if (line) speak(line);
  }, [step, isSupported, currentStepData?.id, speak]);

  useEffect(() => {
    if (!showWelcome || !isSupported || !firstName) return;
    const msg =
      role === "provider"
        ? `Hallo ${firstName}! Ich freue mich auf unsere Zusammenarbeit.`
        : `Hallo ${firstName}! Schön dass du dabei bist.`;
    speak(msg);
  }, [showWelcome, isSupported, firstName, role, speak]);

  const canProceed = () => {
    switch (currentLogicalStep) {
      case 0: return fullName.trim().length >= 2;
      case 7: return true;
      case 1: return true;
      case 2: return professionType !== "";
      case 3: return true;
      case 4: return true;
      case 5:
        return (
          email.includes("@") &&
          password.length >= 8 &&
          /[A-Z]/.test(password) &&
          /[0-9]/.test(password) &&
          agbAccepted &&
          privacyAccepted &&
          widerrufAccepted
        );
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < maxStep) {
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
      country,
      businessName: businessName.trim() || undefined,
      clientType: role === "client" ? clientType : undefined,
      professionType: role === "provider" ? professionType : undefined,
      salutation: salutation !== "none" ? salutation : undefined,
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
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 38% 30%, #ffab60 0%, #f97316 60%, #e06010 100%)",
              boxShadow: "0 0 0 8px rgba(249,115,22,0.15), 0 0 32px rgba(249,115,22,0.3)",
            }}
          >
            <span className="text-3xl">🐴</span>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <h1 className="text-3xl font-bold text-foreground">
              Willkommen{firstName ? `, ${firstName}` : ""}! 🎉
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {role === "provider"
                ? "Dein Betrieb wartet — leg los."
                : "Dein Pferd ist in guten Händen."}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
            <Button size="lg" className="w-full h-14 text-base font-semibold gap-2" onClick={onCancel}>
              Jetzt starten <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const totalDots = maxStep + 1;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* ── Step 0: Name ── */}
          {currentLogicalStep === 0 && (
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

          {/* ── Step 7: Salutation ── */}
          {currentLogicalStep === 7 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">
                  Wie möchtest du angesprochen werden{firstName ? `, ${firstName}` : ""}?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  So spricht dich Hufi persönlich an.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SALUTATION_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSalutation(s.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      salutation === s.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="font-semibold text-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Role ── */}
          {currentLogicalStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Registrieren als</p>
                <h2 className="text-2xl font-bold text-foreground">Welche Rolle hast du?</h2>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setRole("provider")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[80px]",
                    role === "provider" ? "border-primary bg-primary/10 shadow-md" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", role === "provider" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Hammer className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Mobiler Pferdeprofi</p>
                    <p className="text-sm text-muted-foreground">Termine, Kunden & Rechnungen verwalten</p>
                    <p className="text-xs text-primary/70 mt-0.5">Hufbearbeiter · Osteopath · Tierarzt · u.v.m.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[80px] relative",
                    role === "client" ? "border-primary bg-primary/10 shadow-md" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">GRATIS</div>
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", role === "client" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Heart className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Pferdebesitzer</p>
                    <p className="text-sm text-muted-foreground">Pferdeakte einsehen & Termine buchen</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Kostenlos · Keine Kreditkarte nötig</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Profession (providers) ── */}
          {currentLogicalStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Was ist dein Beruf?</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PROFESSIONS.map((p, i) => (
                  <motion.button
                    key={p.value}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setProfessionType(p.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      professionType === p.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <span className="text-xs font-medium text-foreground leading-tight">{p.label}</span>
                  </motion.button>
                ))}
              </div>
              {professionType && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground text-center"
                >
                  {PROFESSIONS.find((p) => p.value === professionType)?.description}
                </motion.p>
              )}
            </div>
          )}

          {/* ── Step 3: Client Type ── */}
          {currentLogicalStep === 3 && (
            <ClientTypeSelection value={clientType} onChange={setClientType} />
          )}

          {/* ── Step 4: Country ── */}
          {currentLogicalStep === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">In welchem Land arbeitest du?</h2>
              </div>
              <div className="space-y-3">
                {DACH_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[64px]",
                      country === c.code ? "border-primary bg-primary/10 shadow-md" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="text-3xl">{c.flag}</span>
                    <p className="font-semibold text-foreground text-lg">{c.name}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCountry("DE")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all min-h-[56px] opacity-60"
                >
                  <span className="text-3xl">🌍</span>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Anderes Land</p>
                    <p className="text-xs text-muted-foreground">Standardeinstellungen (DE) werden verwendet</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Credentials ── */}
          {currentLogicalStep === 5 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Dein Zugang</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">E-Mail</Label>
                  <Input
                    id="s-email" type="email" inputMode="email" autoComplete="email"
                    placeholder="deine@email.de" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="h-[52px] text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-pw">Passwort</Label>
                  <Input
                    id="s-pw" type="password" autoComplete="new-password"
                    placeholder="Min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="h-[52px] text-base"
                    onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                  />
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <Progress
                        value={
                          (password.length >= 8 ? 33 : 0) +
                          (/[A-Z]/.test(password) ? 33 : 0) +
                          (/[0-9]/.test(password) ? 34 : 0)
                        }
                        className="h-1.5"
                      />
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className={password.length >= 8 ? "text-green-500" : "text-muted-foreground"}>
                          {password.length >= 8 ? "✓" : "○"} 8+ Zeichen
                        </span>
                        <span className={/[A-Z]/.test(password) ? "text-green-500" : "text-muted-foreground"}>
                          {/[A-Z]/.test(password) ? "✓" : "○"} Großbuchstabe
                        </span>
                        <span className={/[0-9]/.test(password) ? "text-green-500" : "text-muted-foreground"}>
                          {/[0-9]/.test(password) ? "✓" : "○"} Zahl
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agb-consent"
                      checked={agbAccepted}
                      onCheckedChange={(v) => setAgbAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="agb-consent" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
                      Ich akzeptiere die{" "}
                      <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">AGB</a>{" "}
                      und{" "}
                      <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Nutzungsbedingungen</a>. *
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy-consent"
                      checked={privacyAccepted}
                      onCheckedChange={(v) => setPrivacyAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="privacy-consent" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
                      Ich habe die{" "}
                      <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Datenschutzerklärung</a>{" "}
                      gelesen und stimme zu. *
                    </Label>
                  </div>
                  <WiderrufsausschlussCheckbox
                    checked={widerrufAccepted}
                    onCheckedChange={(v) => { setWiderrufAccepted(v); if (v) setWiderrufError(false); }}
                    error={widerrufError}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Business Name (providers) ── */}
          {currentLogicalStep === 6 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Dein Betrieb</h2>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-biz">Betriebsname (optional)</Label>
                <Input
                  id="s-biz" type="text" placeholder="z.B. Hufservice Mein-Name" autoFocus
                  value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  className="h-[52px] text-base"
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
                <p className="text-xs text-muted-foreground">Erscheint auf deiner Seite. Du kannst das später ändern.</p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {currentStepData.motivation}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="min-h-[52px]">
            Zurück
          </Button>
        )}
        <Button
          className="flex-1 h-14 text-base font-semibold gap-2"
          disabled={!canProceed() || loading}
          onClick={handleNext}
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {step === maxStep ? "Registrieren" : "Weiter"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>

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
