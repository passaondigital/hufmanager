import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsappTemplates";

interface LeadCaptureFormProps {
  selectedPlan?: string;
  horses: number;
  zone: 1 | 2;
  intervalWeeks: number;
  providerId: string;
  providerWhatsApp?: string;
}

export function LeadCaptureForm({
  selectedPlan,
  horses,
  zone,
  intervalWeeks,
  providerId,
  providerWhatsApp,
}: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const distanceLabel = zone === 1 ? "bis 25 km" : "25–50 km";
  const whatsAppText = `Hallo Pascal, ich interessiere mich für ${selectedPlan || "eure Hufpflege"} für ${horses} Pferd(e). Mein Stall ist ca. ${distanceLabel} entfernt. Können wir sprechen?`;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !dsgvo) return;
    setSending(true);
    try {
      const { error } = await supabase.from("website_leads").insert({
        owner_id: providerId,
        contact_name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        horse_name: `${horses} Pferd(e)`,
        service_interest: selectedPlan || null,
        preferred_timeframe: `Alle ${intervalWeeks} Wochen`,
        dsgvo_consent: true,
        source: "kalkulator",
        urgency: 1,
      });
      if (error) throw error;

      // Trigger notification
      try {
        await supabase.functions.invoke("funnel-lead-notify", {
          body: {
            lead: {
              full_name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              topic: "frage",
              contact_preference: "phone",
              source: "Kalkulator",
              message: `Interesse an ${selectedPlan || "Hufpflege"}, ${horses} Pferd(e), ${distanceLabel}, alle ${intervalWeeks} Wochen`,
            },
          },
        });
      } catch {
        // notification is best-effort
      }

      setSent(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
          <h3 className="text-xl font-bold">Danke für dein Interesse!</h3>
          <p className="text-muted-foreground">
            Ich melde mich innerhalb von 24 Stunden bei dir.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact form */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-[#F47B20]" />
            Kontaktformular
          </h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="calc-name">Name *</Label>
              <Input
                id="calc-name"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="calc-email">E-Mail *</Label>
              <Input
                id="calc-email"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="calc-phone">Telefon (optional)</Label>
              <Input
                id="calc-phone"
                type="tel"
                placeholder="+49 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
              />
            </div>

            {selectedPlan && (
              <p className="text-sm text-muted-foreground">
                Gewähltes Paket: <strong>{selectedPlan}</strong>
              </p>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                checked={dsgvo}
                onCheckedChange={(v) => setDsgvo(!!v)}
                id="calc-dsgvo"
              />
              <label htmlFor="calc-dsgvo" className="text-xs text-muted-foreground leading-tight">
                Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
                <a href="/datenschutz" className="underline" target="_blank">
                  Datenschutzerklärung
                </a>{" "}
                zu. *
              </label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={sending || !name.trim() || !email.trim() || !dsgvo}
              className="w-full bg-[#F47B20] hover:bg-[#d96a15] text-white"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Anfrage senden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp option */}
      <Card>
        <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Direkt per WhatsApp
            </h3>
            <p className="text-sm text-muted-foreground">
              Schreib mir direkt — schnell, unkompliziert und persönlich.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm italic text-muted-foreground">
              "{whatsAppText}"
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => {
              if (providerWhatsApp) {
                openWhatsApp(providerWhatsApp, whatsAppText);
              }
            }}
            disabled={!providerWhatsApp}
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp öffnen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
