import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Diamond } from "lucide-react";

interface SubscriptionSettings {
  price_4_weeks_zone1: number;
  price_4_weeks_zone2: number;
  price_6_weeks_zone1: number;
  price_6_weeks_zone2: number;
  price_8_weeks_zone1: number;
  price_8_weeks_zone2: number;
  discount_percentage: number;
  copecart_base_url: string;
}

const defaultSettings: SubscriptionSettings = {
  price_4_weeks_zone1: 0,
  price_4_weeks_zone2: 0,
  price_6_weeks_zone1: 0,
  price_6_weeks_zone2: 0,
  price_8_weeks_zone1: 0,
  price_8_weeks_zone2: 0,
  discount_percentage: 5,
  copecart_base_url: "",
};

export default function AboMatrix() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SubscriptionSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_settings")
        .select("*")
        .eq("provider_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          price_4_weeks_zone1: data.price_4_weeks_zone1 || 0,
          price_4_weeks_zone2: data.price_4_weeks_zone2 || 0,
          price_6_weeks_zone1: data.price_6_weeks_zone1 || 0,
          price_6_weeks_zone2: data.price_6_weeks_zone2 || 0,
          price_8_weeks_zone1: data.price_8_weeks_zone1 || 0,
          price_8_weeks_zone2: data.price_8_weeks_zone2 || 0,
          discount_percentage: data.discount_percentage || 5,
          copecart_base_url: data.copecart_base_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching subscription settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("subscription_settings")
        .upsert({
          provider_id: user.id,
          ...settings,
        }, {
          onConflict: "provider_id",
        });

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Abo-Matrix wurde erfolgreich aktualisiert.",
      });
    } catch (error) {
      console.error("Error saving subscription settings:", error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SubscriptionSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Diamond className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold">Abo-Matrix</h1>
          <p className="text-muted-foreground">Konfiguriere deine Abonnement-Preise und Copecart-Integration</p>
        </div>
      </div>

      {/* Pricing Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Preismatrix</CardTitle>
          <CardDescription>
            Definiere die Preise pro Intervall und Zone (in Euro)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Header Row */}
            <div className="grid grid-cols-3 gap-4 text-center font-medium text-sm text-muted-foreground">
              <div>Intervall</div>
              <div>Zone 1</div>
              <div>Zone 2</div>
            </div>

            {/* 4 Weeks Row */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-base font-medium">4 Wochen</Label>
              <div>
                <Input
                  type="number"
                  value={settings.price_4_weeks_zone1}
                  onChange={(e) => updateSetting("price_4_weeks_zone1", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={settings.price_4_weeks_zone2}
                  onChange={(e) => updateSetting("price_4_weeks_zone2", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 6 Weeks Row */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-base font-medium">6 Wochen</Label>
              <div>
                <Input
                  type="number"
                  value={settings.price_6_weeks_zone1}
                  onChange={(e) => updateSetting("price_6_weeks_zone1", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={settings.price_6_weeks_zone2}
                  onChange={(e) => updateSetting("price_6_weeks_zone2", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 8 Weeks Row */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-base font-medium">8 Wochen</Label>
              <div>
                <Input
                  type="number"
                  value={settings.price_8_weeks_zone1}
                  onChange={(e) => updateSetting("price_8_weeks_zone1", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={settings.price_8_weeks_zone2}
                  onChange={(e) => updateSetting("price_8_weeks_zone2", parseInt(e.target.value) || 0)}
                  className="text-center"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Setting */}
      <Card>
        <CardHeader>
          <CardTitle>Rabatt</CardTitle>
          <CardDescription>
            Rabatt in Prozent für Abo-Kunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 max-w-xs">
            <Input
              type="number"
              value={settings.discount_percentage}
              onChange={(e) => updateSetting("discount_percentage", parseInt(e.target.value) || 0)}
              className="text-center"
              min={0}
              max={100}
            />
            <span className="text-lg font-medium">%</span>
          </div>
        </CardContent>
      </Card>

      {/* Copecart Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Copecart Integration</CardTitle>
          <CardDescription>
            Basis-URL für Copecart Checkout-Links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="url"
            value={settings.copecart_base_url}
            onChange={(e) => updateSetting("copecart_base_url", e.target.value)}
            placeholder="https://www.copecart.com/products/..."
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  );
}
