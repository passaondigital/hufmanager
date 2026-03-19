import { useState } from "react";
import { Building2, Home, Warehouse, ChevronRight, Upload, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useClientMode, type ClientMode } from "@/hooks/useClientMode";
import { toast } from "sonner";
import { VerificationDocuments } from "./VerificationDocuments";

interface ClientModeSettingsProps {
  /** If true, shows as onboarding-style card. If false, as settings section. */
  variant?: "onboarding" | "settings";
  onComplete?: () => void;
}

const MODES: { mode: ClientMode; icon: typeof Home; badge?: string }[] = [
  { mode: "private", icon: Home },
  { mode: "stall", icon: Warehouse, badge: "Verifizierung nötig" },
  { mode: "commercial", icon: Building2, badge: "Verifizierung nötig" },
];

export function ClientModeSettings({ variant = "settings", onComplete }: ClientModeSettingsProps) {
  const { mode, modeInfo, setMode, isSettingMode, MODE_LABELS, MODE_DESCRIPTIONS } = useClientMode();
  const [selectedMode, setSelectedMode] = useState<ClientMode>(mode);
  const [companyName, setCompanyName] = useState(modeInfo.companyName || "");
  const [step, setStep] = useState<"select" | "verify">("select");

  const handleSelect = (m: ClientMode) => {
    setSelectedMode(m);
    if (m !== "private" && m !== mode) {
      setStep("verify");
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
            toast.success("Verifizierungsantrag eingereicht! Ein Admin wird deinen Account prüfen.");
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
          <h2 className="text-xl font-semibold text-foreground">Wie nutzt du HufManager?</h2>
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
          {MODES.map(({ mode: m, icon: Icon, badge }) => (
            <button
              key={m}
              onClick={() => handleSelect(m)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                selectedMode === m
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                selectedMode === m ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{MODE_LABELS[m]}</p>
                  {badge && m !== "private" && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{MODE_DESCRIPTIONS[m]}</p>
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

      {step === "verify" && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Verifizierung für {MODE_LABELS[selectedMode]}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedMode === "stall"
                  ? "Stallbetreiber-Features werden nach Admin-Prüfung freigeschaltet."
                  : "Gewerbliche Features werden nach Admin-Prüfung freigeschaltet."}
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

            {/* Verification Documents Upload */}
            <VerificationDocuments mode={selectedMode} />

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Was passiert als Nächstes?</p>
              <ul className="space-y-1">
                <li>• Dein Antrag wird an unser Team gesendet</li>
                {selectedMode === "stall" && (
                  <>
                    <li>• Wir prüfen deinen <span className="font-medium">Gewerbeschein</span> und die <span className="font-medium">§11 TierSchG Erlaubnis</span></li>
                    <li>• Ohne §11-Nachweis kann kein Stall-Account freigeschaltet werden</li>
                  </>
                )}
                {selectedMode === "commercial" && (
                  <li>• Wir prüfen deinen <span className="font-medium">Gewerbeschein</span></li>
                )}
                <li>• Prüfung dauert 1-2 Werktage</li>
                <li>• Nach Freigabe werden alle {MODE_LABELS[selectedMode]}-Features aktiviert</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
              Zurück
            </Button>
            <Button onClick={handleConfirm} disabled={isSettingMode} className="flex-1">
              {isSettingMode ? "Wird gesendet..." : "Antrag senden"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
