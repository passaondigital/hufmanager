import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Building2, Clock, Euro, CreditCard, Loader2 } from "lucide-react";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

interface Hours {
  open: boolean;
  from: string;
  to: string;
}

type WeekHours = Record<string, Hours>;

const defaultHours = (): WeekHours =>
  Object.fromEntries(
    DAYS.map((d) => [d, { open: d !== "So", from: "08:00", to: "18:00" }])
  );

export default function BusinessEinstellungen() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [leistungen, setLeistungen] = useState("");
  const [hours, setHours] = useState<WeekHours>(defaultHours());
  const [payments, setPayments] = useState({ bar: true, ueberweisung: true, paypal: false, karte: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("business_opening_hours");
    if (stored) { try { setHours(JSON.parse(stored)); } catch {} }
    const storedLeistungen = localStorage.getItem("business_leistungen");
    if (storedLeistungen) setLeistungen(storedLeistungen);
    const storedPayments = localStorage.getItem("business_payments");
    if (storedPayments) { try { setPayments(JSON.parse(storedPayments)); } catch {} }

    if (!user) { setLoading(false); return; }
    supabase
      .from("business_settings")
      .select("business_name, address, tax_number")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBusinessName((data as any).business_name || "");
          setAddress((data as any).address || "");
          setTaxNumber((data as any).tax_number || "");
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    localStorage.setItem("business_opening_hours", JSON.stringify(hours));
  }, [hours]);

  useEffect(() => {
    localStorage.setItem("business_leistungen", leistungen);
  }, [leistungen]);

  useEffect(() => {
    localStorage.setItem("business_payments", JSON.stringify(payments));
  }, [payments]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_settings")
        .upsert(
          { user_id: user.id, business_name: businessName, address, tax_number: taxNumber },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Business-Einstellungen aktualisiert." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (role !== "provider" && role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Nur für Gewerbe-Nutzer</h2>
          <p className="text-sm text-muted-foreground mb-4">Diese Seite ist nur für Profi-Konten verfügbar.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Zurück</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 mb-2 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" /> Zurück
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Business Einstellungen</h1>
        <p className="text-muted-foreground mt-1">Betrieb, Zeiten & Leistungen</p>
      </div>

      {/* Betriebsdaten */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Betriebsdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="bName">Betriebsname</Label>
            <Input id="bName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Muster Hufschmiede" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bAddr">Adresse</Label>
            <Input id="bAddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Musterstraße 1, 12345 Musterstadt" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bTax">Steuernummer</Label>
            <Input id="bTax" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="123/456/78901" />
          </div>
        </CardContent>
      </Card>

      {/* Öffnungszeiten */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Öffnungszeiten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <div className="w-8 text-sm font-medium text-muted-foreground">{day}</div>
              <Switch
                checked={hours[day].open}
                onCheckedChange={(v) =>
                  setHours((h) => ({ ...h, [day]: { ...h[day], open: v } }))
                }
              />
              {hours[day].open ? (
                <>
                  <Input
                    type="time"
                    value={hours[day].from}
                    onChange={(e) =>
                      setHours((h) => ({ ...h, [day]: { ...h[day], from: e.target.value } }))
                    }
                    className="w-28 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="time"
                    value={hours[day].to}
                    onChange={(e) =>
                      setHours((h) => ({ ...h, [day]: { ...h[day], to: e.target.value } }))
                    }
                    className="w-28 text-sm"
                  />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Geschlossen</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preise & Leistungen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="w-4 h-4" /> Preise & Leistungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={leistungen}
            onChange={(e) => setLeistungen(e.target.value)}
            placeholder="z.B. Beschlag ab 120 €, Korrektur ab 80 €..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Zahlungsoptionen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Zahlungsoptionen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "bar", label: "Bar" },
            { key: "ueberweisung", label: "Überweisung" },
            { key: "paypal", label: "PayPal" },
            { key: "karte", label: "Kartenzahlung" },
          ].map((p) => (
            <div key={p.key} className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.label}</span>
              <Switch
                checked={payments[p.key as keyof typeof payments]}
                onCheckedChange={(v) =>
                  setPayments((prev) => ({ ...prev, [p.key]: v }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Speichern...</> : "Speichern"}
      </Button>
    </div>
  );
}
