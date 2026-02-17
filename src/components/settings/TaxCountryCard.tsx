import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Globe, Loader2, Save, Info, AlertTriangle, QrCode } from "lucide-react";
import {
  TaxCountry,
  COUNTRY_OPTIONS,
  getDACHConfig,
  getCurrencyForCountry,
  formatCurrencyDACH,
} from "@/lib/dachConfig";

interface TaxSettings {
  tax_country: TaxCountry;
  default_vat_rate: number;
  currency: string;
  swiss_rounding: boolean;
}

export function TaxCountryCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TaxSettings>({
    tax_country: 'DE',
    default_vat_rate: 19,
    currency: 'EUR',
    swiss_rounding: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('business_settings')
      .select('tax_country, default_vat_rate, currency, swiss_rounding')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        tax_country: (data.tax_country as TaxCountry) || 'DE',
        default_vat_rate: data.default_vat_rate ?? 19,
        currency: data.currency || 'EUR',
        swiss_rounding: data.swiss_rounding ?? false,
      });
    }
    setLoading(false);
  };

  const handleCountryChange = (country: TaxCountry) => {
    const config = getDACHConfig(country);
    const currency = getCurrencyForCountry(country);
    
    setSettings({
      ...settings,
      tax_country: country,
      default_vat_rate: config.defaultVatRate,
      currency: currency,
      swiss_rounding: country === 'CH' ? settings.swiss_rounding : false,
    });
  };

  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: userData.user.id,
          tax_country: settings.tax_country,
          default_vat_rate: settings.default_vat_rate,
          currency: settings.currency,
          swiss_rounding: settings.swiss_rounding,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: "Steuereinstellungen gespeichert" });
    } catch (error: any) {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentCountry = COUNTRY_OPTIONS.find(c => c.value === settings.tax_country);
  const isSwiss = settings.tax_country === 'CH';
  const config = getDACHConfig(settings.tax_country);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Land / Steuersitz
        </CardTitle>
        <CardDescription>
          Währung und Mehrwertsteuer werden automatisch angepasst
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Country Selection */}
        <div className="space-y-2">
          <Label htmlFor="tax_country">Land auswählen</Label>
          <Select
            value={settings.tax_country}
            onValueChange={(value) => handleCountryChange(value as TaxCountry)}
          >
            <SelectTrigger id="tax_country" className="w-full">
              <SelectValue>
                {currentCountry && (
                  <span className="flex items-center gap-2">
                    <span>{currentCountry.flag}</span>
                    <span>{currentCountry.label}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.flag}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency & VAT Display */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Währung</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3">
              <span className="text-sm font-medium">
                {settings.currency === 'CHF' ? 'CHF (Schweizer Franken)' : '€ (Euro)'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_rate">Standard-MwSt. (%)</Label>
            <Input
              id="vat_rate"
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={settings.default_vat_rate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_vat_rate: parseFloat(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {settings.default_vat_rate === 0
                ? 'Keine MwSt. (Kleinunternehmer)'
                : `Standard für ${currentCountry?.label}: ${config.defaultVatRate}%`}
            </p>
          </div>
        </div>

        {/* Swiss Features */}
        {isSwiss && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="swiss_rounding" className="font-medium">
                  Rappen-Rundung
                </Label>
                <p className="text-xs text-muted-foreground">
                  Beträge auf 5 Rappen runden (0.05 CHF)
                </p>
              </div>
              <Switch
                id="swiss_rounding"
                checked={settings.swiss_rounding}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, swiss_rounding: checked })
                }
              />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <QrCode className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">QR-Rechnung aktiv</p>
                  <p className="text-xs text-muted-foreground">
                    Deine Rechnungen enthalten automatisch einen Swiss QR-Zahlteil. 
                    Stelle sicher, dass deine IBAN in den Geschäftseinstellungen hinterlegt ist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Austria RKSV Notice */}
        {settings.tax_country === 'AT' && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Hinweis zur Registrierkassenpflicht (RKSV)
                </p>
                <p className="text-xs text-muted-foreground">
                  HufManager ist ein Praxis- und Rechnungstool – <strong>keine zertifizierte Registrierkasse</strong> im Sinne der RKSV. 
                  Für Barverkäufe über 0 € benötigst du eine separate, BMF-zertifizierte Kassenlösung. 
                  Rechnungen per Überweisung/Bankeinzug sind von der RKSV nicht betroffen.
                </p>
                <a 
                  href="https://www.bmf.gv.at/themen/steuern/selbststaendige-unternehmer/registrierkassen.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline hover:no-underline inline-block mt-1"
                >
                  Mehr Infos auf bmf.gv.at →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Vorschau Rechnungsformat</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Betrag: <span className="font-mono font-medium text-foreground">
                {formatCurrencyDACH(125.50, settings.currency as 'EUR' | 'CHF', { 
                  swissRounding: settings.swiss_rounding 
                })}
              </span>
            </p>
            <p>
              {config.vatLabel} ({settings.default_vat_rate}%): <span className="font-mono font-medium text-foreground">
                {formatCurrencyDACH(
                  125.50 * (settings.default_vat_rate / 100), 
                  settings.currency as 'EUR' | 'CHF',
                  { swissRounding: settings.swiss_rounding }
                )}
              </span>
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Speichern
        </Button>
      </CardContent>
    </Card>
  );
}
