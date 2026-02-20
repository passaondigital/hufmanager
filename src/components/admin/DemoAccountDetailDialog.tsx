import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Zap, Sparkles, Shield } from "lucide-react";
import { FEATURE_DEFINITIONS, FeatureKey, FeatureStatus, FeatureStatuses } from "@/types/featureFlags";
import { FeatureStatusSelect } from "@/components/admin/FeatureStatusSelect";
import { cn } from "@/lib/utils";

interface DemoAccountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    email: string;
    label: string;
    icon: React.ElementType;
    expectedRole: string;
    profileId: string | null;
    fullName: string | null;
    readableId: string | null;
  } | null;
  onSaved: () => void;
}

type AutoflowMode = "basis" | "plus" | "premium";

interface AutoflowSettings {
  id?: string;
  autoflow_mode: string;
  auto_reminder_enabled: boolean;
  auto_invoice_enabled: boolean;
  auto_schedule_enabled: boolean;
  auto_feedback_enabled: boolean;
  monthly_checkin_enabled: boolean;
}

const DEFAULT_AUTOFLOW: AutoflowSettings = {
  autoflow_mode: "basis",
  auto_reminder_enabled: false,
  auto_invoice_enabled: false,
  auto_schedule_enabled: false,
  auto_feedback_enabled: false,
  monthly_checkin_enabled: false,
};

export function DemoAccountDetailDialog({ open, onOpenChange, account, onSaved }: DemoAccountDetailDialogProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allFeaturesEnabled, setAllFeaturesEnabled] = useState(false);
  const [featureStatuses, setFeatureStatuses] = useState<FeatureStatuses>({});
  const [autoflow, setAutoflow] = useState<AutoflowSettings>(DEFAULT_AUTOFLOW);

  // Load current settings when account changes
  useEffect(() => {
    if (!open || !account?.profileId) return;
    loadSettings();
  }, [open, account?.profileId]);

  const loadSettings = async () => {
    if (!account?.profileId) return;
    setLoading(true);

    try {
      // Load feature statuses from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("feature_statuses, feature_flags")
        .eq("id", account.profileId)
        .maybeSingle();

      const statuses = (profile?.feature_statuses as FeatureStatuses) || {};
      setFeatureStatuses(statuses);

      // Check if ALL features are set to public
      const allPublic = FEATURE_DEFINITIONS.every(
        (f) => (statuses[f.key] || f.defaultStatus) === "public"
      );
      setAllFeaturesEnabled(allPublic);

      // Load autoflow settings (only for provider role)
      if (account.expectedRole === "provider") {
        const { data: af } = await supabase
          .from("autoflow_settings")
          .select("id, autoflow_mode, auto_reminder_enabled, auto_invoice_enabled, auto_schedule_enabled, auto_feedback_enabled, monthly_checkin_enabled")
          .eq("provider_id", account.profileId)
          .maybeSingle();

        if (af) {
          setAutoflow(af);
        } else {
          setAutoflow(DEFAULT_AUTOFLOW);
        }
      }
    } catch (err) {
      console.error("Error loading demo account settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllFeatures = (enabled: boolean) => {
    setAllFeaturesEnabled(enabled);
    if (enabled) {
      const allPublic: FeatureStatuses = {};
      FEATURE_DEFINITIONS.forEach((f) => {
        allPublic[f.key] = "public";
      });
      setFeatureStatuses(allPublic);
    }
  };

  const handleFeatureChange = (key: FeatureKey, status: FeatureStatus) => {
    setFeatureStatuses((prev) => ({ ...prev, [key]: status }));
    // If any feature is not public, uncheck the wildcard
    if (status !== "public") {
      setAllFeaturesEnabled(false);
    }
  };

  const handleSave = async () => {
    if (!account?.profileId) return;
    setSaving(true);

    try {
      // Save feature statuses to profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ feature_statuses: featureStatuses as any })
        .eq("id", account.profileId);

      if (profileError) throw profileError;

      // Save autoflow settings (only for provider)
      if (account.expectedRole === "provider") {
        const payload = {
          provider_id: account.profileId,
          autoflow_mode: autoflow.autoflow_mode,
          auto_reminder_enabled: autoflow.auto_reminder_enabled,
          auto_invoice_enabled: autoflow.auto_invoice_enabled,
          auto_schedule_enabled: autoflow.auto_schedule_enabled,
          auto_feedback_enabled: autoflow.auto_feedback_enabled,
          monthly_checkin_enabled: autoflow.monthly_checkin_enabled,
        };

        if (autoflow.id) {
          const { error } = await supabase
            .from("autoflow_settings")
            .update(payload)
            .eq("id", autoflow.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("autoflow_settings")
            .upsert(payload, { onConflict: "provider_id" });
          if (error) throw error;
        }
      }

      toast.success(`${account.label}: Einstellungen gespeichert`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!account) return null;
  const Icon = account.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold">{account.label}</p>
              <p className="text-xs text-muted-foreground truncate">{account.email}</p>
            </div>
            {account.readableId && (
              <Badge variant="secondary" className="text-xs font-mono ml-auto shrink-0">
                #{account.readableId}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-10rem)]">
            <div className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-5">
              {/* Wildcard: Alle Features freischalten */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="font-semibold text-sm">Alle Features freischalten</Label>
                    <p className="text-xs text-muted-foreground">Inkl. zukünftiger Features</p>
                  </div>
                </div>
                <Switch
                  checked={allFeaturesEnabled}
                  onCheckedChange={handleToggleAllFeatures}
                />
              </div>

              {/* Individual Feature Toggles */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Feature-Steuerung
                </h4>
                <div className="space-y-2">
                  {FEATURE_DEFINITIONS.map((feature) => {
                    const status = featureStatuses[feature.key] || feature.defaultStatus;
                    const isDisabled = status === "disabled";

                    return (
                      <div
                        key={feature.key}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                          isDisabled
                            ? "bg-muted/50 border-muted opacity-60"
                            : "bg-card border-border"
                        )}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-sm font-medium truncate">{feature.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                        </div>
                        <FeatureStatusSelect
                          value={status}
                          onValueChange={(s) => handleFeatureChange(feature.key, s)}
                          disabled={allFeaturesEnabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AutoFlow Section - only for provider */}
              {account.expectedRole === "provider" && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      AutoFlow
                    </h4>

                    {/* Mode selector */}
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Modus</Label>
                      <Select
                        value={autoflow.autoflow_mode}
                        onValueChange={(v) => setAutoflow((prev) => ({ ...prev, autoflow_mode: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basis">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Basis
                            </span>
                          </SelectItem>
                          <SelectItem value="plus">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Plus
                            </span>
                          </SelectItem>
                          <SelectItem value="premium">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Premium
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* AutoFlow toggles */}
                    <div className="space-y-2.5">
                      {[
                        { key: "auto_reminder_enabled" as const, label: "Auto-Erinnerungen" },
                        { key: "auto_invoice_enabled" as const, label: "Auto-Rechnungen" },
                        { key: "auto_schedule_enabled" as const, label: "Auto-Terminplanung" },
                        { key: "auto_feedback_enabled" as const, label: "Auto-Feedback" },
                        { key: "monthly_checkin_enabled" as const, label: "Monatlicher Check-in" },
                      ].map((toggle) => (
                        <div key={toggle.key} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                          <Label className="text-sm">{toggle.label}</Label>
                          <Switch
                            checked={autoflow[toggle.key]}
                            onCheckedChange={(v) =>
                              setAutoflow((prev) => ({ ...prev, [toggle.key]: v }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Save Footer */}
        <div className="p-4 sm:p-6 pt-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
