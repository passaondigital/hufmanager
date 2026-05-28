import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Loader2 } from "lucide-react";
import type { EcosystemSetting } from "@/hooks/useEcosystemStats";

const APPS = ["hufmanager", "hufiai", "memberhorse"];

interface Props {
  settings: EcosystemSetting[];
  onUpdate: () => void;
}

export function EcosystemSettingsPanel({ settings, onUpdate }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, Partial<EcosystemSetting>>>(() => {
    const map: Record<string, Partial<EcosystemSetting>> = {};
    for (const s of settings) {
      map[s.app_key] = s;
    }
    return map;
  });

  const getSetting = (appKey: string): Partial<EcosystemSetting> =>
    localSettings[appKey] || {
      auto_sync_enabled: false,
      sync_interval_minutes: 60,
      sync_direction: "push",
      notification_on_sync: true,
      notification_on_error: true,
    };

  const updateLocal = (appKey: string, updates: Partial<EcosystemSetting>) => {
    setLocalSettings((prev) => ({
      ...prev,
      [appKey]: { ...getSetting(appKey), ...updates },
    }));
  };

  const handleSave = async (appKey: string) => {
    if (!user) return;
    setSaving(appKey);

    const s = getSetting(appKey);
    const { error } = await supabase
      .from("ecosystem_settings")
      .upsert(
        {
          user_id: user.id,
          app_key: appKey,
          auto_sync_enabled: s.auto_sync_enabled ?? false,
          sync_interval_minutes: s.sync_interval_minutes ?? 60,
          sync_direction: s.sync_direction ?? "push",
          notification_on_sync: s.notification_on_sync ?? true,
          notification_on_error: s.notification_on_error ?? true,
        },
        { onConflict: "user_id,app_key" }
      );

    if (error) {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden.", variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: `Einstellungen für ${appKey} aktualisiert.` });
      onUpdate();
    }
    setSaving(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Sync-Einstellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {APPS.map((appKey) => {
          const s = getSetting(appKey);
          const isSaving = saving === appKey;

          return (
            <div key={appKey} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium capitalize">{appKey}</h4>
                <Button size="sm" variant="outline" onClick={() => handleSave(appKey)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  <span className="ml-1.5">Speichern</span>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Sync</span>
                  <Switch
                    checked={s.auto_sync_enabled ?? false}
                    onCheckedChange={(v) => updateLocal(appKey, { auto_sync_enabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Fehler-Benachrichtigung</span>
                  <Switch
                    checked={s.notification_on_error ?? true}
                    onCheckedChange={(v) => updateLocal(appKey, { notification_on_error: v })}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Richtung</span>
                  <Select
                    value={s.sync_direction ?? "push"}
                    onValueChange={(v) => updateLocal(appKey, { sync_direction: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push (→ Hufi)</SelectItem>
                      <SelectItem value="pull">Pull (← Hufi)</SelectItem>
                      <SelectItem value="bidirectional">Bidirektional (↔)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Intervall</span>
                  <Select
                    value={String(s.sync_interval_minutes ?? 60)}
                    onValueChange={(v) => updateLocal(appKey, { sync_interval_minutes: Number(v) })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">Alle 15 Min</SelectItem>
                      <SelectItem value="30">Alle 30 Min</SelectItem>
                      <SelectItem value="60">Stündlich</SelectItem>
                      <SelectItem value="360">Alle 6 Std</SelectItem>
                      <SelectItem value="1440">Täglich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
