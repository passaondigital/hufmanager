import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  auto_contract_on_registration: {
    label: "Vertrag bei Registrierung auto-generieren",
    description: "Erstellt automatisch einen Nutzungsvertrag bei neuer Provider-Registrierung",
  },
  auto_invoice_after_signing: {
    label: "Rechnung auto-erstellen nach Vertragsunterzeichnung",
    description: "Generiert automatisch eine Rechnung wenn der Provider unterzeichnet",
  },
  auto_monthly_invoices: {
    label: "Monatliche Auto-Rechnungen (nur Überweisung)",
    description: "Erstellt monatliche Rechnungen für Provider mit Banküberweisung",
  },
  auto_dunning: {
    label: "Mahnungen automatisch nach 3/14/21 Tagen",
    description: "Sendet automatische Mahnungen bei unbezahlten Rechnungen",
  },
  auto_legal_reminders: {
    label: "Erinnerungen bei AGB-Änderungen (7/30 Tage)",
    description: "Erinnert Provider automatisch an ausstehende AGB-Bestätigungen",
  },
};

export function AdminAutomationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_settings").select("key, value");
    const map: Record<string, boolean> = {};
    (data || []).forEach((s) => {
      map[s.key] = s.value === true || s.value === "true";
    });
    setSettings(map);
    setLoading(false);
  };

  const toggleSetting = async (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const { error } = await supabase
      .from("admin_settings")
      .update({ value: value, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("key", key);

    if (error) {
      toast.error("Fehler beim Speichern");
      setSettings((prev) => ({ ...prev, [key]: !value }));
    } else {
      toast.success(`${value ? "Aktiviert" : "Deaktiviert"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" /> Auto-Flow Einstellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(SETTING_LABELS).map(([key, { label, description }]) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="space-y-0.5">
              <Label className="font-medium">{label}</Label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={settings[key] ?? false}
              onCheckedChange={(v) => toggleSetting(key, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
