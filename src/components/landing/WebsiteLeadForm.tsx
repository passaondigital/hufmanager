import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

interface Props {
  providerId: string;
  providerName: string;
  primaryColor: string;
  services?: { id: string; name: string }[];
}

export const WebsiteLeadForm = ({ providerId, providerName, primaryColor, services }: Props) => {
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Step 1
  const [horseName, setHorseName] = useState("");
  const [breed, setBreed] = useState("");
  const [horseAge, setHorseAge] = useState("");
  const [hoofCondition, setHoofCondition] = useState("");

  // Step 2
  const [serviceInterest, setServiceInterest] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [urgency, setUrgency] = useState(1);

  // Step 3
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plz, setPlz] = useState("");
  const [dsgvo, setDsgvo] = useState(false);

  const handleSubmit = async () => {
    if (!contactName.trim() || !dsgvo) return;
    setSending(true);
    try {
      const { error } = await supabase.from("website_leads").insert({
        owner_id: providerId,
        horse_name: horseName || null,
        breed: breed || null,
        horse_age: horseAge || null,
        hoof_condition: hoofCondition || null,
        service_interest: serviceInterest || null,
        urgency,
        preferred_timeframe: timeframe || null,
        contact_name: contactName.trim(),
        phone: phone || null,
        email: email || null,
        plz: plz || null,
        dsgvo_consent: true,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      // fallback silently
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: primaryColor }} />
          <h3 className="text-xl font-bold text-foreground">Anfrage gesendet!</h3>
          <p className="text-muted-foreground">
            {providerName} wird sich schnellstmöglich bei dir melden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: s <= step ? primaryColor : "hsl(var(--muted))" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">🐴 Erzähl mir von deinem Pferd</h3>
            <Input placeholder="Pferdename (optional)" value={horseName} onChange={(e) => setHorseName(e.target.value)} />
            <Input placeholder="Rasse" value={breed} onChange={(e) => setBreed(e.target.value)} />
            <Input placeholder="Alter" value={horseAge} onChange={(e) => setHorseAge(e.target.value)} />
            <Select value={hoofCondition} onValueChange={setHoofCondition}>
              <SelectTrigger><SelectValue placeholder="Hufzustand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">🟢 Gut</SelectItem>
                <SelectItem value="noticeable">🟡 Auffällig</SelectItem>
                <SelectItem value="urgent">🔴 Dringend</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full gap-2" style={{ backgroundColor: primaryColor }} onClick={() => setStep(2)}>
              Weiter <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">⚙️ Was brauchst du?</h3>
            {services && services.length > 0 ? (
              <Select value={serviceInterest} onValueChange={setServiceInterest}>
                <SelectTrigger><SelectValue placeholder="Gewünschte Leistung" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="Gewünschte Leistung" value={serviceInterest} onChange={(e) => setServiceInterest(e.target.value)} />
            )}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger><SelectValue placeholder="Wunsch-Zeitraum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diese-woche">Diese Woche</SelectItem>
                <SelectItem value="naechste-woche">Nächste Woche</SelectItem>
                <SelectItem value="diesen-monat">Diesen Monat</SelectItem>
                <SelectItem value="flexibel">Flexibel</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Wie dringend? ({["", "Nicht eilig", "Bald", "Mittel", "Dringend", "Heute noch"][urgency]})</label>
              <input type="range" min={1} max={5} value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Zurück</Button>
              <Button className="flex-1 gap-2" style={{ backgroundColor: primaryColor }} onClick={() => setStep(3)}>
                Weiter <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">📬 Wie erreiche ich dich?</h3>
            <Input placeholder="Dein Name *" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            <Input placeholder="Telefon" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="PLZ" value={plz} onChange={(e) => setPlz(e.target.value)} />
            <div className="flex items-start gap-2">
              <Checkbox checked={dsgvo} onCheckedChange={(v) => setDsgvo(!!v)} id="dsgvo" />
              <label htmlFor="dsgvo" className="text-xs text-muted-foreground leading-tight">
                Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu. *
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1"><ArrowLeft className="h-4 w-4" />Zurück</Button>
              <Button className="flex-1 gap-2" style={{ backgroundColor: primaryColor }} onClick={handleSubmit} disabled={sending || !contactName.trim() || !dsgvo}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Anfrage senden
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
