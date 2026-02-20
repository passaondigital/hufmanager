import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Zap,
  CalendarClock,
  FileText,
  Star,
  Bell,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Rocket,
  Crown,
} from "lucide-react";

export type AutoflowMode = "basis" | "plus" | "premium";

interface WizardSettings {
  autoflow_mode: AutoflowMode;
  auto_schedule_enabled: boolean;
  auto_schedule_mode: string;
  preferred_slot_days: number;
  group_by_plz: boolean;
  auto_invoice_enabled: boolean;
  auto_invoice_trigger: string;
  auto_feedback_enabled: boolean;
  feedback_delay_hours: number;
  feedback_channel: string;
  auto_reminder_enabled: boolean;
  reminder_hours_before: number;
  monthly_checkin_enabled: boolean;
}

const DEFAULT_SETTINGS: WizardSettings = {
  autoflow_mode: "basis",
  auto_schedule_enabled: false,
  auto_schedule_mode: "suggest",
  preferred_slot_days: 7,
  group_by_plz: true,
  auto_invoice_enabled: false,
  auto_invoice_trigger: "after_signature",
  auto_feedback_enabled: true,
  feedback_delay_hours: 24,
  feedback_channel: "push",
  auto_reminder_enabled: true,
  reminder_hours_before: 24,
  monthly_checkin_enabled: true,
};

const MODE_PRESETS: Record<AutoflowMode, Partial<WizardSettings>> = {
  basis: {
    auto_schedule_enabled: true,
    auto_schedule_mode: "suggest",
    auto_invoice_enabled: false,
    auto_feedback_enabled: false,
    auto_reminder_enabled: true,
    reminder_hours_before: 24,
  },
  plus: {
    auto_schedule_enabled: true,
    auto_schedule_mode: "suggest",
    auto_invoice_enabled: true,
    auto_invoice_trigger: "after_signature",
    auto_feedback_enabled: true,
    feedback_delay_hours: 24,
    auto_reminder_enabled: true,
    reminder_hours_before: 24,
  },
  premium: {
    auto_schedule_enabled: true,
    auto_schedule_mode: "auto",
    auto_invoice_enabled: true,
    auto_invoice_trigger: "on_completion",
    auto_feedback_enabled: true,
    feedback_delay_hours: 12,
    feedback_channel: "both",
    auto_reminder_enabled: true,
    reminder_hours_before: 48,
    monthly_checkin_enabled: true,
  },
};

interface AutoFlowSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (settings: WizardSettings) => void;
  initialSettings?: Partial<WizardSettings>;
}

const TOTAL_STEPS = 4;

export function AutoFlowSetupWizard({
  open,
  onOpenChange,
  onComplete,
  initialSettings,
}: AutoFlowSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<WizardSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const update = (partial: Partial<WizardSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const selectMode = (mode: AutoflowMode) => {
    update({ autoflow_mode: mode, ...MODE_PRESETS[mode] });
  };

  const handleComplete = () => {
    onComplete(settings);
    onOpenChange(false);
    setStep(0);
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const enabledCount = [
    settings.auto_schedule_enabled,
    settings.auto_invoice_enabled,
    settings.auto_feedback_enabled,
    settings.auto_reminder_enabled,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Step 0: Mode Selection */}
          {step === 0 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Zap className="h-5 w-5 text-primary" />
                  AutoFlow einrichten
                </DialogTitle>
                <DialogDescription>
                  Wähle dein Automatisierungslevel. Du kannst alles jederzeit anpassen.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                {([
                  {
                    mode: "basis" as AutoflowMode,
                    icon: Sparkles,
                    title: "Basis",
                    desc: "Neukunden-Anfragen & Erinnerungen",
                    features: ["Lead → Terminvorschlag", "Termin-Erinnerungen"],
                    color: "text-blue-500",
                    bgColor: "bg-blue-500/10",
                    borderColor: "border-blue-500/40",
                  },
                  {
                    mode: "plus" as AutoflowMode,
                    icon: Rocket,
                    title: "Plus",
                    desc: "Bestandskunden-Management",
                    features: ["Alles aus Basis", "Auto-Rechnungen", "Feedback-Erinnerungen"],
                    color: "text-amber-500",
                    bgColor: "bg-amber-500/10",
                    borderColor: "border-amber-500/40",
                  },
                  {
                    mode: "premium" as AutoflowMode,
                    icon: Crown,
                    title: "Premium",
                    desc: "Vollautomatik für Profis",
                    features: ["Alles aus Plus", "Voll-Automatische Terminvergabe", "Multi-Kanal Benachrichtigungen"],
                    color: "text-emerald-500",
                    bgColor: "bg-emerald-500/10",
                    borderColor: "border-emerald-500/40",
                  },
                ]).map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = settings.autoflow_mode === plan.mode;
                  return (
                    <button
                      key={plan.mode}
                      type="button"
                      onClick={() => selectMode(plan.mode)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                        "hover:bg-muted/50",
                        isSelected
                          ? `${plan.borderColor} ${plan.bgColor}`
                          : "border-border"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", plan.bgColor)}>
                        <Icon className={cn("h-5 w-5", plan.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{plan.title}</span>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Check className="h-3 w-3" />
                              Gewählt
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{plan.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {plan.features.map((f) => (
                            <span key={f} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1",
                        isSelected ? `${plan.borderColor} ${plan.bgColor}` : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className={cn("h-3 w-3", plan.color)} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 1: Lead & Termine */}
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Termine & Leads
                </DialogTitle>
                <DialogDescription>
                  Wie sollen Neukundenanfragen verarbeitet werden?
                </DialogDescription>
              </DialogHeader>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Lead → Termin</Label>
                      <p className="text-xs text-muted-foreground">Anfragen automatisch in Termine umwandeln</p>
                    </div>
                    <Switch
                      checked={settings.auto_schedule_enabled}
                      onCheckedChange={(v) => update({ auto_schedule_enabled: v })}
                    />
                  </div>

                  {settings.auto_schedule_enabled && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-sm">Modus</Label>
                        <Select value={settings.auto_schedule_mode} onValueChange={(v) => update({ auto_schedule_mode: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Voll-Automatisch</SelectItem>
                            <SelectItem value="suggest">Vorschläge (du bestätigst)</SelectItem>
                            <SelectItem value="manual">Client bucht selbst</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Zeitfenster: {settings.preferred_slot_days} Tage</Label>
                        <Slider
                          value={[settings.preferred_slot_days]}
                          onValueChange={([v]) => update({ preferred_slot_days: v })}
                          min={3} max={30} step={1}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Nach PLZ gruppieren</Label>
                          <p className="text-xs text-muted-foreground">Fahrten bündeln</p>
                        </div>
                        <Switch checked={settings.group_by_plz} onCheckedChange={(v) => update({ group_by_plz: v })} />
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Termin-Erinnerungen</Label>
                      <p className="text-xs text-muted-foreground">Kunden automatisch erinnern</p>
                    </div>
                    <Switch
                      checked={settings.auto_reminder_enabled}
                      onCheckedChange={(v) => update({ auto_reminder_enabled: v })}
                    />
                  </div>
                  {settings.auto_reminder_enabled && (
                    <div className="space-y-1.5 pl-1">
                      <Label className="text-sm">Vorlauf: {settings.reminder_hours_before}h</Label>
                      <Slider
                        value={[settings.reminder_hours_before]}
                        onValueChange={([v]) => update({ reminder_hours_before: v })}
                        min={1} max={72} step={1}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Rechnungen & Feedback */}
          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Rechnungen & Feedback
                </DialogTitle>
                <DialogDescription>
                  Automatisiere dein Finanz- und Bewertungsmanagement.
                </DialogDescription>
              </DialogHeader>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Rechnung</Label>
                      <p className="text-xs text-muted-foreground">Rechnungen automatisch erstellen</p>
                    </div>
                    <Switch
                      checked={settings.auto_invoice_enabled}
                      onCheckedChange={(v) => update({ auto_invoice_enabled: v })}
                    />
                  </div>
                  {settings.auto_invoice_enabled && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-sm">Auslöser</Label>
                        <Select value={settings.auto_invoice_trigger} onValueChange={(v) => update({ auto_invoice_trigger: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_completion">Bei Termin-Abschluss</SelectItem>
                            <SelectItem value="after_signature">Nach Unterschrift</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Feedback-Erinnerung</Label>
                      <p className="text-xs text-muted-foreground">Kunden automatisch um Bewertung bitten</p>
                    </div>
                    <Switch
                      checked={settings.auto_feedback_enabled}
                      onCheckedChange={(v) => update({ auto_feedback_enabled: v })}
                    />
                  </div>
                  {settings.auto_feedback_enabled && (
                    <>
                      <div className="space-y-1.5 pl-1">
                        <Label className="text-sm">Verzögerung: {settings.feedback_delay_hours}h</Label>
                        <Slider
                          value={[settings.feedback_delay_hours]}
                          onValueChange={([v]) => update({ feedback_delay_hours: v })}
                          min={1} max={72} step={1}
                        />
                      </div>
                      <div className="space-y-1.5 pl-1">
                        <Label className="text-sm">Kanal</Label>
                        <Select value={settings.feedback_channel} onValueChange={(v) => update({ feedback_channel: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="push">Push</SelectItem>
                            <SelectItem value="email">E-Mail</SelectItem>
                            <SelectItem value="both">Beides</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Zusammenfassung
                </DialogTitle>
                <DialogDescription>
                  Prüfe deine Einstellungen und aktiviere AutoFlow.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">AutoFlow-Modus</span>
                  <Badge variant="outline" className="capitalize">{settings.autoflow_mode}</Badge>
                </div>

                {([
                  { label: "Lead → Termin", enabled: settings.auto_schedule_enabled, detail: settings.auto_schedule_mode === "auto" ? "Voll-Automatisch" : settings.auto_schedule_mode === "suggest" ? "Vorschläge" : "Self-Service", icon: CalendarClock },
                  { label: "Auto-Rechnung", enabled: settings.auto_invoice_enabled, detail: settings.auto_invoice_trigger === "on_completion" ? "Bei Abschluss" : "Nach Unterschrift", icon: FileText },
                  { label: "Feedback", enabled: settings.auto_feedback_enabled, detail: `Nach ${settings.feedback_delay_hours}h`, icon: Star },
                  { label: "Erinnerungen", enabled: settings.auto_reminder_enabled, detail: `${settings.reminder_hours_before}h vorher`, icon: Bell },
                ]).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", item.enabled ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.enabled && (
                          <span className="text-xs text-muted-foreground">{item.detail}</span>
                        )}
                        <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                          {item.enabled ? "Aktiv" : "Aus"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-muted-foreground text-center pt-2">
                  {enabledCount}/4 Automatisierungen aktiv · Alle Einstellungen sind jederzeit änderbar
                </p>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
            <div>
              {step < TOTAL_STEPS - 1 ? (
                <Button size="sm" onClick={next}>
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleComplete}>
                  <Zap className="h-4 w-4 mr-1" />
                  AutoFlow aktivieren
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
