import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Diamond, Link as LinkIcon, Check, X, Settings2 } from "lucide-react";

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

interface SubscriptionLink {
  id?: string;
  interval: string;
  horse_count: number;
  copecart_url: string;
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

const INTERVALS = ["4", "6", "8"] as const;
const HORSE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function AboMatrix() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SubscriptionSettings>(defaultSettings);
  const [links, setLinks] = useState<Map<string, SubscriptionLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);

  const getLinkKey = (interval: string, horseCount: number) => `${interval}-${horseCount}`;

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // Fetch settings and links in parallel
      const [settingsRes, linksRes] = await Promise.all([
        supabase
          .from("subscription_settings")
          .select("*")
          .eq("provider_id", user?.id)
          .maybeSingle(),
        supabase
          .from("subscription_links")
          .select("*")
          .eq("provider_id", user?.id),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (linksRes.error) throw linksRes.error;

      if (settingsRes.data) {
        setSettings({
          price_4_weeks_zone1: settingsRes.data.price_4_weeks_zone1 || 0,
          price_4_weeks_zone2: settingsRes.data.price_4_weeks_zone2 || 0,
          price_6_weeks_zone1: settingsRes.data.price_6_weeks_zone1 || 0,
          price_6_weeks_zone2: settingsRes.data.price_6_weeks_zone2 || 0,
          price_8_weeks_zone1: settingsRes.data.price_8_weeks_zone1 || 0,
          price_8_weeks_zone2: settingsRes.data.price_8_weeks_zone2 || 0,
          discount_percentage: settingsRes.data.discount_percentage || 5,
          copecart_base_url: settingsRes.data.copecart_base_url || "",
        });
      }

      // Build links map
      const linksMap = new Map<string, SubscriptionLink>();
      linksRes.data?.forEach((link) => {
        const key = getLinkKey(link.interval, link.horse_count);
        linksMap.set(key, {
          id: link.id,
          interval: link.interval,
          horse_count: link.horse_count,
          copecart_url: link.copecart_url,
        });
      });
      setLinks(linksMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
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
        description: "Preismatrix wurde erfolgreich aktualisiert.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLink = useCallback((interval: string, horseCount: number, url: string) => {
    const key = getLinkKey(interval, horseCount);
    setLinks((prev) => {
      const newMap = new Map(prev);
      const existing = prev.get(key);
      newMap.set(key, {
        ...existing,
        interval,
        horse_count: horseCount,
        copecart_url: url,
      });
      return newMap;
    });
  }, []);

  const handleSaveLinks = async () => {
    if (!user?.id) return;

    setSavingLinks(true);
    try {
      // Delete all existing links for this provider
      await supabase
        .from("subscription_links")
        .delete()
        .eq("provider_id", user.id);

      // Insert all non-empty links
      const linksToInsert = Array.from(links.values())
        .filter((link) => link.copecart_url.trim() !== "")
        .map((link) => ({
          provider_id: user.id,
          interval: link.interval,
          horse_count: link.horse_count,
          copecart_url: link.copecart_url.trim(),
        }));

      if (linksToInsert.length > 0) {
        const { error } = await supabase
          .from("subscription_links")
          .insert(linksToInsert);

        if (error) throw error;
      }

      toast({
        title: "Links gespeichert",
        description: `${linksToInsert.length} Checkout-Links wurden gespeichert.`,
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error saving links:", error);
      toast({
        title: "Fehler",
        description: "Links konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSavingLinks(false);
    }
  };

  const updateSetting = (key: keyof SubscriptionSettings, value: number | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const getConfiguredLinksCount = () => {
    return Array.from(links.values()).filter((l) => l.copecart_url.trim() !== "").length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Diamond className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold">Abo-Matrix</h1>
          <p className="text-muted-foreground">Konfiguriere Preise und Copecart Checkout-Links</p>
        </div>
      </div>

      <Tabs defaultValue="prices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="prices" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Preise
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Links
            {getConfiguredLinksCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getConfiguredLinksCount()}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices" className="space-y-6">
          {/* Pricing Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Preismatrix</CardTitle>
              <CardDescription>
                Definiere die Preise pro Pferd, Intervall und Zone (in Euro)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Header Row */}
                <div className="grid grid-cols-3 gap-4 text-center font-medium text-sm text-muted-foreground">
                  <div>Intervall</div>
                  <div>Zone 1 (Nahbereich)</div>
                  <div>Zone 2 (Weiter entfernt)</div>
                </div>

                {/* 4 Weeks Row */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-base font-medium">4 Wochen</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_4_weeks_zone1}
                      onChange={(e) => updateSetting("price_4_weeks_zone1", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_4_weeks_zone2}
                      onChange={(e) => updateSetting("price_4_weeks_zone2", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                </div>

                {/* 6 Weeks Row */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-base font-medium">6 Wochen</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_6_weeks_zone1}
                      onChange={(e) => updateSetting("price_6_weeks_zone1", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_6_weeks_zone2}
                      onChange={(e) => updateSetting("price_6_weeks_zone2", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                </div>

                {/* 8 Weeks Row */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-base font-medium">8 Wochen</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_8_weeks_zone1}
                      onChange={(e) => updateSetting("price_8_weeks_zone1", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.price_8_weeks_zone2}
                      onChange={(e) => updateSetting("price_8_weeks_zone2", parseInt(e.target.value) || 0)}
                      className="text-center pr-8"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
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
                Rabatt in Prozent für Abo-Kunden (wird im Wizard angezeigt)
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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Preise speichern
            </Button>
          </div>
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Copecart Checkout-Links</CardTitle>
              <CardDescription>
                Füge für jede Kombination aus Intervall und Pferdeanzahl einen individuellen Copecart-Link ein.
                Leere Felder werden ignoriert.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Pferde</th>
                      {INTERVALS.map((int) => (
                        <th key={int} className="text-center py-3 px-2 font-medium text-muted-foreground">
                          {int} Wochen
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORSE_COUNTS.map((horseCount) => (
                      <tr key={horseCount} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="font-mono">
                            {horseCount} {horseCount === 1 ? "Pferd" : "Pferde"}
                          </Badge>
                        </td>
                        {INTERVALS.map((interval) => {
                          const key = getLinkKey(interval, horseCount);
                          const link = links.get(key);
                          const hasUrl = link?.copecart_url?.trim();
                          
                          return (
                            <td key={interval} className="py-2 px-2">
                              <div className="relative">
                                <Input
                                  type="url"
                                  value={link?.copecart_url || ""}
                                  onChange={(e) => updateLink(interval, horseCount, e.target.value)}
                                  placeholder="https://copecart.com/..."
                                  className={`text-xs ${hasUrl ? "border-green-500/50 bg-green-500/5" : ""}`}
                                />
                                {hasUrl && (
                                  <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Konfigurierte Links:</span>
                  <Badge variant={getConfiguredLinksCount() > 0 ? "default" : "secondary"}>
                    {getConfiguredLinksCount()} / {INTERVALS.length * HORSE_COUNTS.length}
                  </Badge>
                </div>
                <Button onClick={handleSaveLinks} disabled={savingLinks} size="lg">
                  {savingLinks ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Links speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
