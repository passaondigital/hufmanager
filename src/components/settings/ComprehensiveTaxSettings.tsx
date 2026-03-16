import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Building2, Scale, Landmark, FileText, Loader2, Save, User, Mail, Hash, Info,
} from "lucide-react";
import {
  getLegalFormsForCountry, getLegalFormDef, VAT_RATES,
  type PriceDisplayMode,
} from "@/lib/taxConfig";

interface BusinessTaxData {
  legal_form: string | null;
  price_display_mode: PriceDisplayMode;
  kleine_unternehmer: boolean;
  mwst_pflichtig: boolean;
  default_vat_rate: number;
  tax_country: string;
  tax_number: string;
  vat_id: string;
  finanzamt: string;
  handelsregister: string;
  berufsbezeichnung: string;
  kammer: string;
  steuerberater_name: string;
  steuerberater_email: string;
  datev_mandanten_nr: string;
  bilanzpflicht: boolean;
  vorsteuerabzug: boolean;
}

const DEFAULTS: BusinessTaxData = {
  legal_form: null,
  price_display_mode: "netto",
  kleine_unternehmer: false,
  mwst_pflichtig: false,
  default_vat_rate: 19,
  tax_country: "DE",
  tax_number: "",
  vat_id: "",
  finanzamt: "",
  handelsregister: "",
  berufsbezeichnung: "",
  kammer: "",
  steuerberater_name: "",
  steuerberater_email: "",
  datev_mandanten_nr: "",
  bilanzpflicht: false,
  vorsteuerabzug: false,
};

export function ComprehensiveTaxSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BusinessTaxData>(DEFAULTS);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: bs } = await supabase
      .from("business_settings")
      .select(
        "legal_form, price_display_mode, kleine_unternehmer, mwst_pflichtig, default_vat_rate, tax_country, tax_number, vat_id, finanzamt, handelsregister, berufsbezeichnung, kammer, steuerberater_name, steuerberater_email, datev_mandanten_nr, bilanzpflicht, vorsteuerabzug"
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (bs) {
      setData({
        legal_form: (bs as any).legal_form || null,
        price_display_mode: ((bs as any).price_display_mode as PriceDisplayMode) || "netto",
        kleine_unternehmer: bs.kleine_unternehmer ?? false,
        mwst_pflichtig: bs.mwst_pflichtig ?? false,
        default_vat_rate: bs.default_vat_rate ?? 19,
        tax_country: bs.tax_country || "DE",
        tax_number: bs.tax_number || "",
        vat_id: bs.vat_id || "",
        finanzamt: (bs as any).finanzamt || "",
        handelsregister: (bs as any).handelsregister || "",
        berufsbezeichnung: (bs as any).berufsbezeichnung || "",
        kammer: (bs as any).kammer || "",
        steuerberater_name: (bs as any).steuerberater_name || "",
        steuerberater_email: (bs as any).steuerberater_email || "",
        datev_mandanten_nr: (bs as any).datev_mandanten_nr || "",
        bilanzpflicht: (bs as any).bilanzpflicht ?? false,
        vorsteuerabzug: (bs as any).vorsteuerabzug ?? false,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_settings")
        .upsert(
          {
            user_id: userData.user.id,
            legal_form: data.legal_form,
            price_display_mode: data.price_display_mode,
            kleine_unternehmer: data.kleine_unternehmer,
            mwst_pflichtig: data.mwst_pflichtig,
            default_vat_rate: data.default_vat_rate,
            tax_number: data.tax_number || null,
            vat_id: data.vat_id || null,
            finanzamt: data.finanzamt || null,
            handelsregister: data.handelsregister || null,
            berufsbezeichnung: data.berufsbezeichnung || null,
            kammer: data.kammer || null,
            steuerberater_name: data.steuerberater_name || null,
            steuerberater_email: data.steuerberater_email || null,
            datev_mandanten_nr: data.datev_mandanten_nr || null,
            bilanzpflicht: data.bilanzpflicht,
            vorsteuerabzug: data.vorsteuerabzug,
          } as any,
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast({ title: "Steuer- & Rechtseinstellungen gespeichert" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLegalFormChange = (value: string) => {
    const def = getLegalFormDef(value);
    setData((prev) => ({
      ...prev,
      legal_form: value,
      kleine_unternehmer: def?.defaultKleinunternehmer ?? prev.kleine_unternehmer,
      mwst_pflichtig: def ? !def.defaultKleinunternehmer : prev.mwst_pflichtig,
    }));
  };

  const legalFormDef = data.legal_form ? getLegalFormDef(data.legal_form) : null;
  const availableForms = getLegalFormsForCountry(data.tax_country);
  const vatInfo = VAT_RATES[data.tax_country] || VAT_RATES.DE;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Rechtsform */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Rechtsform & Unternehmenstyp
          </CardTitle>
          <CardDescription>
            Bestimmt Pflichtangaben auf Rechnungen und im Impressum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rechtsform</Label>
            <Select value={data.legal_form || ""} onValueChange={handleLegalFormChange}>
              <SelectTrigger>
                <SelectValue placeholder="Rechtsform wählen…" />
              </SelectTrigger>
              <SelectContent>
                {availableForms.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span className="flex items-center gap-2">
                      {f.label}
                      {f.defaultKleinunternehmer && (
                        <Badge variant="secondary" className="text-[10px] py-0">KU möglich</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {legalFormDef && (
              <p className="text-xs text-muted-foreground">{legalFormDef.description}</p>
            )}
          </div>

          {legalFormDef?.requiresHandelsregister && (
            <div className="space-y-2">
              <Label>Handelsregister-Eintrag</Label>
              <Input
                placeholder="HRB 12345, Amtsgericht Musterstadt"
                value={data.handelsregister}
                onChange={(e) => setData({ ...data, handelsregister: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Pflichtangabe im Impressum für diese Rechtsform</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Berufsbezeichnung</Label>
            <Input
              placeholder="z.B. Hufpfleger, Hufschmied, Tierphysiotherapeut"
              value={data.berufsbezeichnung}
              onChange={(e) => setData({ ...data, berufsbezeichnung: e.target.value })}
            />
          </div>

          {legalFormDef?.requiresKammer && (
            <div className="space-y-2">
              <Label>Zuständige Kammer</Label>
              <Input
                placeholder="z.B. Handwerkskammer München"
                value={data.kammer}
                onChange={(e) => setData({ ...data, kammer: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. MwSt & Preisanzeige */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Umsatzsteuer & Preisanzeige
          </CardTitle>
          <CardDescription>
            Steuert wie Preise in deinem System gespeichert und angezeigt werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Kleinunternehmer Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">Kleinunternehmerregelung</Label>
              <p className="text-xs text-muted-foreground">
                {data.tax_country === "DE" && "§19 UStG – keine MwSt bei Umsatz < 25.000€/Jahr"}
                {data.tax_country === "AT" && "§6 Abs. 1 Z 27 UStG – Grenze 35.000€/Jahr"}
                {data.tax_country === "CH" && "MWST-Befreiung unter CHF 100'000/Jahr"}
              </p>
            </div>
            <Switch
              checked={data.kleine_unternehmer}
              onCheckedChange={(checked) =>
                setData({ ...data, kleine_unternehmer: checked, mwst_pflichtig: !checked })
              }
            />
          </div>

          {/* MwSt-pflichtig */}
          {!data.kleine_unternehmer && (
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="font-medium">{vatInfo.label}-pflichtig</Label>
                <p className="text-xs text-muted-foreground">
                  Regelbesteuerung mit {vatInfo.standard}% {vatInfo.label}
                </p>
              </div>
              <Switch
                checked={data.mwst_pflichtig}
                onCheckedChange={(checked) => setData({ ...data, mwst_pflichtig: checked })}
              />
            </div>
          )}

          {/* MwSt-Satz */}
          {data.mwst_pflichtig && !data.kleine_unternehmer && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{vatInfo.label}-Satz (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={data.default_vat_rate}
                  onChange={(e) => setData({ ...data, default_vat_rate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Standard {data.tax_country}: {vatInfo.standard}% / Ermäßigt: {vatInfo.reduced}%
                </p>
              </div>
            </div>
          )}

          {/* Preis-Display-Modus */}
          <div className="space-y-2">
            <Label>Preise eingeben als</Label>
            <Select
              value={data.price_display_mode}
              onValueChange={(v: PriceDisplayMode) => setData({ ...data, price_display_mode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="netto">
                  Netto-Preise (MwSt wird aufgeschlagen)
                </SelectItem>
                <SelectItem value="brutto">
                  Brutto-Preise (MwSt ist enthalten)
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  {data.price_display_mode === "netto" ? (
                    <>
                      <p><strong>Du gibst Netto-Preise ein.</strong></p>
                      <p>Beispiel: Du trägst 45€ ein → Rechnung zeigt 45€ + {data.mwst_pflichtig && !data.kleine_unternehmer ? `${(45 * data.default_vat_rate / 100).toFixed(2)}€ ${vatInfo.label}` : "0€ MwSt"} = {data.mwst_pflichtig && !data.kleine_unternehmer ? `${(45 * (1 + data.default_vat_rate / 100)).toFixed(2)}€` : "45€"} brutto</p>
                      {data.kleine_unternehmer && <p>Als Kleinunternehmer: Netto = Brutto (keine MwSt)</p>}
                    </>
                  ) : (
                    <>
                      <p><strong>Du gibst Brutto-Preise ein.</strong></p>
                      <p>Beispiel: Du trägst 53,55€ ein → Rechnung zeigt {data.mwst_pflichtig && !data.kleine_unternehmer ? `${(53.55 / (1 + data.default_vat_rate / 100)).toFixed(2)}€ netto + ${(53.55 - 53.55 / (1 + data.default_vat_rate / 100)).toFixed(2)}€ ${vatInfo.label}` : "53,55€ (keine MwSt)"} = 53,55€ brutto</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vorsteuerabzug */}
          {data.mwst_pflichtig && !data.kleine_unternehmer && (
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="font-medium">Vorsteuerabzug berechtigt</Label>
                <p className="text-xs text-muted-foreground">
                  Eingangsrechnungen mit Vorsteuer verrechnen
                </p>
              </div>
              <Switch
                checked={data.vorsteuerabzug}
                onCheckedChange={(checked) => setData({ ...data, vorsteuerabzug: checked })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Steuerdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Steuerdaten & Finanzamt
          </CardTitle>
          <CardDescription>
            Pflichtangaben für Rechnungen, Impressum und Steuererklärung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Steuernummer</Label>
              <Input
                placeholder={data.tax_country === "CH" ? "CHE-123.456.789" : "12/345/67890"}
                value={data.tax_number}
                onChange={(e) => setData({ ...data, tax_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{data.tax_country === "CH" ? "UID (MWST-Nr.)" : "USt-IdNr."}</Label>
              <Input
                placeholder={data.tax_country === "CH" ? "CHE-123.456.789 MWST" : data.tax_country === "AT" ? "ATU12345678" : "DE123456789"}
                value={data.vat_id}
                onChange={(e) => setData({ ...data, vat_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Erforderlich für B2B-Rechnungen innerhalb der EU
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Zuständiges Finanzamt</Label>
              <Input
                placeholder="Finanzamt Musterstadt"
                value={data.finanzamt}
                onChange={(e) => setData({ ...data, finanzamt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Buchführungspflicht</Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Bilanzierungspflichtig</span>
                <Switch
                  checked={data.bilanzpflicht}
                  onCheckedChange={(checked) => setData({ ...data, bilanzpflicht: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.bilanzpflicht ? "Doppelte Buchführung (Bilanz + GuV)" : "EÜR (Einnahmen-Überschuss-Rechnung)"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Steuerberater */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Steuerberater & DATEV
          </CardTitle>
          <CardDescription>
            Für den automatischen Datenexport an deinen Steuerberater
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Name Steuerberater
              </Label>
              <Input
                placeholder="Max Mustermann Steuerberatung"
                value={data.steuerberater_name}
                onChange={(e) => setData({ ...data, steuerberater_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> E-Mail Steuerberater
              </Label>
              <Input
                type="email"
                placeholder="steuerberater@kanzlei.de"
                value={data.steuerberater_email}
                onChange={(e) => setData({ ...data, steuerberater_email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> DATEV Mandantennummer
            </Label>
            <Input
              placeholder="z.B. 12345"
              value={data.datev_mandanten_nr}
              onChange={(e) => setData({ ...data, datev_mandanten_nr: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Wird bei DATEV-Exporten automatisch eingetragen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Alle Steuer- & Rechtseinstellungen speichern
      </Button>
    </div>
  );
}
