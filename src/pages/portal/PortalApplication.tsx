import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const PORTAL_TYPES = [
  { value: "insurance", label: "Versicherung" },
  { value: "manufacturer", label: "Hersteller / Marke" },
  { value: "veterinary", label: "Tierarzt-Praxis / Klinik" },
  { value: "supplier", label: "Lieferant / Großhandel" },
  { value: "school", label: "Ausbildungsstätte / Schule" },
  { value: "association", label: "Verband / Organisation" },
  { value: "media", label: "Medien / Verlag" },
  { value: "other", label: "Sonstiges" },
];

const REFERRAL_SOURCES = [
  "Empfehlung",
  "Internet-Recherche",
  "Messe / Event",
  "Social Media",
  "Presse / Artikel",
  "Hufi Portal",
  "Sonstiges",
];

const USER_SIZES = ["1-5", "6-20", "21-50", "50+"];

export default function PortalApplication() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactEmail, setContactEmail] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    portal_type: "",
    website: "",
    description: "",
    expectations: "",
    estimated_users: "",
    contact_name: "",
    contact_position: "",
    contact_email: "",
    contact_phone: "",
    referral_source: "",
    preferred_payment: "copecart",
    privacy_accepted: false,
    newsletter_accepted: false,
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy_accepted) {
      toast.error("Bitte akzeptieren Sie die Datenschutzerklärung.");
      return;
    }
    if (!form.company_name || !form.portal_type || !form.description || !form.expectations || !form.contact_name || !form.contact_email) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any).from("portal_applications").insert({
        company_name: form.company_name,
        portal_type: form.portal_type,
        website: form.website || null,
        description: form.description,
        expectations: form.expectations,
        estimated_users: form.estimated_users || null,
        contact_name: form.contact_name,
        contact_position: form.contact_position || null,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        referral_source: form.referral_source || null,
        preferred_payment: form.preferred_payment as "copecart" | "transfer",
        privacy_accepted: form.privacy_accepted,
        newsletter_accepted: form.newsletter_accepted,
      });

      if (error) throw error;
      setContactEmail(form.contact_email);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Application error:", err);
      toast.error("Fehler beim Absenden. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Bewerbung eingegangen!</h1>
            <p className="text-muted-foreground">
              Danke für Ihr Interesse an einem Hufi Business Portal.
              Wir prüfen Ihre Bewerbung und melden uns innerhalb von 48 Stunden.
            </p>
            <p className="text-sm text-muted-foreground">
              Sie erhalten eine Bestätigungs-E-Mail an <span className="font-medium text-foreground">{contactEmail}</span>.
            </p>
            <Button onClick={() => navigate("/portal/galerie")} className="w-full mt-4">
              Zurück zur Portal-Galerie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/portal/galerie")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Portal-Galerie
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">📝 Portal-Bewerbung</CardTitle>
            <p className="text-sm text-muted-foreground">
              Betreiben Sie Ihr Geschäft auf der Hufi-Plattform – dem Betriebssystem der Pferdewelt.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Über Ihr Unternehmen</h3>
                <div>
                  <Label>Unternehmensname *</Label>
                  <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} required />
                </div>
                <div>
                  <Label>Portal-Typ *</Label>
                  <Select value={form.portal_type} onValueChange={(v) => update("portal_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                    <SelectContent>
                      {PORTAL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
                </div>
                <div>
                  <Label>Beschreibung: Was macht Ihr Unternehmen? *</Label>
                  <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} required />
                </div>
                <div>
                  <Label>Was erhoffen Sie sich vom Hufi-Portal? *</Label>
                  <Textarea value={form.expectations} onChange={(e) => update("expectations", e.target.value)} rows={3} required />
                </div>
                <div>
                  <Label>Geschätzte Nutzerzahl</Label>
                  <div className="flex gap-2 mt-1">
                    {USER_SIZES.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={form.estimated_users === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => update("estimated_users", s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Kontaktperson</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input value={form.contact_position} onChange={(e) => update("contact_position", e.target.value)} />
                  </div>
                  <div>
                    <Label>E-Mail *</Label>
                    <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input type="tel" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Source */}
              <div>
                <Label>Wie haben Sie von Hufi erfahren?</Label>
                <Select value={form.referral_source} onValueChange={(v) => update("referral_source", v)}>
                  <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment */}
              <div>
                <Label>Bevorzugte Zahlungsart</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={form.preferred_payment === "copecart" ? "default" : "outline"}
                    size="sm"
                    onClick={() => update("preferred_payment", "copecart")}
                  >
                    CopeCart (automatisch)
                  </Button>
                  <Button
                    type="button"
                    variant={form.preferred_payment === "transfer" ? "default" : "outline"}
                    size="sm"
                    onClick={() => update("preferred_payment", "transfer")}
                  >
                    Überweisung (manuell)
                  </Button>
                </div>
              </div>

              {/* Consent */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy"
                    checked={form.privacy_accepted}
                    onCheckedChange={(v) => update("privacy_accepted", !!v)}
                  />
                  <label htmlFor="privacy" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    Ich habe die <a href="/datenschutz" target="_blank" className="text-primary underline">Datenschutzerklärung</a> gelesen und akzeptiere sie. *
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="newsletter"
                    checked={form.newsletter_accepted}
                    onCheckedChange={(v) => update("newsletter_accepted", !!v)}
                  />
                  <label htmlFor="newsletter" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    Ich möchte über Neuigkeiten informiert werden.
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                📨 Bewerbung absenden
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Wir melden uns innerhalb von 48 Stunden.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
