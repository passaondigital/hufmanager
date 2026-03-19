/**
 * TaxSettingsCard: Standalone card for MwSt / Steuer configuration.
 * Works for both provider (business_settings) and partner (partner_settings).
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

const COUNTRY_OPTIONS = [
  { value: "DE", label: "🇩🇪 Deutschland", currency: "EUR" },
  { value: "AT", label: "🇦🇹 Österreich", currency: "EUR" },
  { value: "CH", label: "🇨🇭 Schweiz", currency: "CHF" },
];

const VAT_RATES: Record<string, { standard: number; reduced: number; label: string; smallBizLabel: string; smallBizLimit: string }> = {
  DE: { standard: 19, reduced: 7, label: "MwSt.", smallBizLabel: "Kleinunternehmer (§19 UStG)", smallBizLimit: "bis 22.000 € Umsatz" },
  AT: { standard: 20, reduced: 10, label: "USt.", smallBizLabel: "Kleinunternehmer", smallBizLimit: "bis 35.000 € Umsatz" },
  CH: { standard: 8.1, reduced: 2.6, label: "MWST", smallBizLabel: "MWST-befreit", smallBizLimit: "unter 100.000 CHF Umsatz" },
};

export function TaxSettingsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tax_country: "DE",
    tax_number: "",
    vat_id: "",
    kleine_unternehmer: false,
    mwst_pflichtig: false,
    default_vat_rate: "19",
    price_display_mode: "netto" as "netto" | "brutto",
    legal_form: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["tax-settings-card", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("tax_country, tax_number, vat_id, kleine_unternehmer, mwst_pflichtig, default_vat_rate, price_display_mode, legal_form")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        tax_country: settings.tax_country || "DE",
        tax_number: (settings as any).tax_number || "",
        vat_id: (settings as any).vat_id || "",
        kleine_unternehmer: settings.kleine_unternehmer ?? false,
        mwst_pflichtig: settings.mwst_pflichtig ?? false,
        default_vat_rate: String(settings.default_vat_rate ?? 19),
        price_display_mode: (settings.price_display_mode as "netto" | "brutto") || "netto",
        legal_form: (settings as any).legal_form || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("business_settings")
        .upsert({
          user_id: user!.id,
          tax_country: form.tax_country,
          tax_number: form.tax_number || null,
          vat_id: form.vat_id || null,
          kleine_unternehmer: form.kleine_unternehmer,
          mwst_pflichtig: form.mwst_pflichtig,
          default_vat_rate: parseFloat(form.default_vat_rate) || 0,
          price_display_mode: form.price_display_mode,
          legal_form: form.legal_form || null,
        } as any, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-settings-card"] });
      queryClient.invalidateQueries({ queryKey: ["tax-config"] });
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success("Steuereinstellungen gespeichert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const vatConfig = VAT_RATES[form.tax_country] || VAT_RATES.DE;
  const currencySymbol = form.tax_country === "CH" ? "CHF" : "€";

  const handleCountryChange = (country: string) => {
    const vat = VAT_RATES[country] || VAT_RATES.DE;
    setForm(prev => ({
      ...prev,
      tax_country: country,
      default_vat_rate: prev.kleine_unternehmer ? "0" : String(vat.standard),
    }));
  };

  if (isLoading) {
    return (
      <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Steuer & MwSt
          </CardTitle>
          <CardDescription>
            Lege fest, wie Preise berechnet und auf Rechnungen dargestellt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Country selector */}
          <div>
            <Label>Land</Label>
            <Select value={form.tax_country} onValueChange={handleCountryChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Steuernummer</Label>
              <Input value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} placeholder="z.B. 12/345/67890" />
            </div>
            <div>
              <Label>USt-IdNr.</Label>
              <Input value={form.vat_id} onChange={e => setForm(p => ({ ...p, vat_id: e.target.value }))} placeholder="z.B. DE123456789" />
            </div>
          </div>

          {/* Legal form */}
          <div>
            <Label>Rechtsform</Label>
            <Select value={form.legal_form} onValueChange={v => setForm(p => ({ ...p, legal_form: v }))}>
              <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="einzelunternehmen">Einzelunternehmen</SelectItem>
                <SelectItem value="gbr">GbR</SelectItem>
                <SelectItem value="gmbh">GmbH</SelectItem>
                <SelectItem value="ug">UG (haftungsbeschränkt)</SelectItem>
                <SelectItem value="freiberufler">Freiberufler</SelectItem>
                <SelectItem value="other">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* MwSt settings */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <p className="text-sm font-semibold text-foreground">Steuereinstellungen ({currencySymbol})</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{vatConfig.label} Standardsatz</Label>
                <Input value={`${vatConfig.standard}%`} disabled className="bg-muted" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{vatConfig.label} ermäßigt</Label>
                <Input value={`${vatConfig.reduced}%`} disabled className="bg-muted" />
              </div>
            </div>

            {/* Kleinunternehmer toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{vatConfig.smallBizLabel}</p>
                <p className="text-xs text-muted-foreground">{vatConfig.smallBizLimit}</p>
              </div>
              <Switch
                checked={form.kleine_unternehmer}
                onCheckedChange={v => setForm(p => ({
                  ...p,
                  kleine_unternehmer: v,
                  mwst_pflichtig: v ? false : p.mwst_pflichtig,
                  default_vat_rate: v ? "0" : String(vatConfig.standard),
                }))}
              />
            </div>

            {/* MwSt-pflichtig toggle */}
            {!form.kleine_unternehmer && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Umsatzsteuerpflichtig</p>
                  <p className="text-xs text-muted-foreground">Aktiviere dies, wenn du {vatConfig.label} auf deinen Rechnungen ausweist</p>
                </div>
                <Switch
                  checked={form.mwst_pflichtig}
                  onCheckedChange={v => setForm(p => ({ ...p, mwst_pflichtig: v }))}
                />
              </div>
            )}

            {/* Default VAT rate */}
            <div>
              <Label>Standard-{vatConfig.label} für Rechnungen</Label>
              <Select
                value={form.default_vat_rate}
                onValueChange={v => setForm(p => ({ ...p, default_vat_rate: v }))}
                disabled={form.kleine_unternehmer}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (befreit)</SelectItem>
                  <SelectItem value={String(vatConfig.reduced)}>{vatConfig.reduced}% (ermäßigt)</SelectItem>
                  <SelectItem value={String(vatConfig.standard)}>{vatConfig.standard}% (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price display mode */}
            <div>
              <Label>Preisanzeige</Label>
              <Select value={form.price_display_mode} onValueChange={(v: "netto" | "brutto") => setForm(p => ({ ...p, price_display_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="netto">Netto (+ {vatConfig.label} auf Rechnung)</SelectItem>
                  <SelectItem value="brutto">Brutto ({vatConfig.label} enthalten)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Bestimmt, ob Preise in Diensten, Angeboten und Rechnungen als Netto oder Brutto angezeigt werden.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
