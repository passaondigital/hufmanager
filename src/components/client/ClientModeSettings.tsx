import { useState } from "react";
import { Building2, Home, Warehouse, ChevronRight, Shield, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useClientMode, type ClientMode } from "@/hooks/useClientMode";
import { toast } from "sonner";
import { VerificationDocuments } from "./VerificationDocuments";

interface ClientModeSettingsProps {
  variant?: "onboarding" | "settings";
  onComplete?: () => void;
}

const MODES: { mode: ClientMode; icon: typeof Home; badge?: string; trialInfo?: string }[] = [
  { mode: "private", icon: Home },
  { mode: "stall", icon: Warehouse, badge: "90 Tage kostenlos", trialInfo: "Teste alle Stallbetreiber-Features 90 Tage lang kostenlos. Danach ist eine Verifizierung erforderlich." },
  { mode: "commercial", icon: Building2, badge: "90 Tage kostenlos", trialInfo: "Teste alle Gewerbe-Features 90 Tage lang kostenlos. Danach ist eine Verifizierung erforderlich." },
];

export function ClientModeSettings({ variant = "settings", onComplete }: ClientModeSettingsProps) {
  const { mode, modeInfo, setMode, isSettingMode, MODE_LABELS, MODE_DESCRIPTIONS } = useClientMode();
  const [selectedMode, setSelectedMode] = useState<ClientMode>(mode);
  const [companyName, setCompanyName] = useState(modeInfo.companyName || "");
  const [step, setStep] = useState<"select" | "details">("select");

  const handleSelect = (m: ClientMode) => {
    setSelectedMode(m);
    if (m !== "private" && m !== mode) {
      setStep("details");
    }
  };

  const handleConfirm = () => {
    if (selectedMode === mode && variant === "settings") {
      toast.info("Modus ist bereits aktiv.");
      return;
    }

    if (selectedMode !== "private" && !companyName.trim()) {
      toast.error("Bitte gib einen Betriebsnamen ein.");
      return;
    }

    setMode(
      { mode: selectedMode, companyName: selectedMode !== "private" ? companyName : undefined },
      {
        onSuccess: () => {
          if (selectedMode === "private") {
            toast.success("Modus auf Pferdebesitzer gesetzt.");
          } else {
            toast.success(`${MODE_LABELS[selectedMode]}-Modus aktiviert! 90 Tage kostenlos testen.`);
          }
          onComplete?.();
        },
        onError: () => {
          toast.error("Fehler beim Speichern.");
        },
      }
    );
  };

  const isOnboarding = variant === "onboarding";

  return (
    <div className={cn("space-y-4", isOnboarding && "max-w-lg mx-auto")}>
      {isOnboarding && (
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Wie nutzt du Hufi?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Wähle deinen Account-Typ. Du kannst ihn später in den Einstellungen ändern.
          </p>
        </div>
      )}

      {!isOnboarding && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Account-Typ</h3>
            <p className="text-sm text-muted-foreground">Aktuell: {MODE_LABELS[mode]}</p>
          </div>
          {modeInfo.isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
              <Check className="h-3 w-3" /> Verifiziert
            </span>
          )}
          {modeInfo.verificationStatus === "pending" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
              <Shield className="h-3 w-3" /> Prüfung läuft
            </span>
          )}
        </div>
      )}

      {step === "select" && (
        <div className="grid gap-3">
          {MODES.map(({ mode: m, icon: Icon, badge, trialInfo }) => (
            <button
              key={m}
              onClick={() => handleSelect(m)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all relative",
                selectedMode === m
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              {badge && (
                <div className="absolute -top-2 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {badge}
                </div>
              )}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                selectedMode === m ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{MODE_LABELS[m]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{MODE_DESCRIPTIONS[m]}</p>
                {trialInfo && selectedMode === m && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">{trialInfo}</p>
                )}
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors",
                selectedMode === m ? "text-primary" : "text-muted-foreground/40"
              )} />
            </button>
          ))}

          {selectedMode === "private" && (
            <Button onClick={handleConfirm} disabled={isSettingMode} className="w-full mt-2">
              {isSettingMode ? "Wird gespeichert..." : isOnboarding ? "Weiter als Pferdebesitzer" : "Speichern"}
            </Button>
          )}
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {MODE_LABELS[selectedMode]} – 90 Tage kostenlos
              </p>
              <p className="text-xs text-muted-foreground">
                Sofort alle Features nutzen. Verifizierung innerhalb von 90 Tagen.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="company-name" className="text-xs">
                {selectedMode === "stall" ? "Stallname" : "Firmenname"} *
              </Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={selectedMode === "stall" ? "z.B. Reiterhof Sonnental" : "z.B. Zuchtbetrieb Müller GmbH"}
                className="mt-1"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">So funktioniert's:</p>
              <ul className="space-y-1">
                <li>✅ Sofort alle {MODE_LABELS[selectedMode]}-Features nutzen</li>
                <li>📅 90 Tage kostenloser Testzeitraum</li>
                <li>📄 Innerhalb der 90 Tage: Verifizierung einreichen</li>
                {selectedMode === "stall" && (
                  <li>📋 Benötigt: Gewerbeschein + §11 TierSchG Erlaubnis</li>
                )}
                {selectedMode === "commercial" && (
                  <li>📋 Benötigt: Gewerbeschein oder Registerauszug</li>
                )}
                <li>🔒 Nach Prüfung: Verifiziertes Badge & voller Zugang</li>
              </ul>
            </div>

            <details className="group">
              <summary className="text-xs text-primary cursor-pointer font-medium flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Jetzt schon Dokumente hochladen (optional)
              </summary>
              <div className="mt-3">
                <VerificationDocuments mode={selectedMode} />
              </div>
            </details>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
              Zurück
            </Button>
            <Button onClick={handleConfirm} disabled={isSettingMode} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {isSettingMode ? "Wird aktiviert..." : "Kostenlos starten 🚀"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
