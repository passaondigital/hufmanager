import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useIssuerProfile, type IssuerProfile } from "@/hooks/useIssuerProfile";

export function AdminIssuerSettings() {
  const { profile, loading, save } = useIssuerProfile();
  const [form, setForm] = useState<IssuerProfile>(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(profile); }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(form);
      toast.success("Anbieter-Profil gespeichert");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof IssuerProfile, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Anbieter-Profil (Rechnungssteller)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Diese Daten erscheinen auf allen Rechnungen und Verträgen.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vollständiger Name</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Firmenname</Label>
              <Input value={form.company} onChange={e => update("company", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Geschäftsadresse</Label>
            <Textarea
              value={form.address}
              onChange={e => update("address", e.target.value)}
              rows={2}
              placeholder="Straße, PLZ Ort"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Bank Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={e => update("iban", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>BIC</Label>
              <Input value={form.bic} onChange={e => update("bic", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kontoinhaber</Label>
            <Input value={form.account_holder} onChange={e => update("account_holder", e.target.value)} />
          </div>

          <Separator />

          {/* Tax */}
          <div className="space-y-2">
            <Label>Steuerhinweis (§19 UStG)</Label>
            <Textarea
              value={form.tax_note}
              onChange={e => update("tax_note", e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Steuernummer (optional)</Label>
            <Input
              value={form.tax_id}
              onChange={e => update("tax_id", e.target.value)}
              placeholder="Leer lassen wenn nicht benötigt"
            />
            <p className="text-xs text-muted-foreground">
              Kleinunternehmer nach §19 UStG sind nicht verpflichtet, eine Steuernummer anzugeben.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
