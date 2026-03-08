import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, Calendar, Clock, Euro } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  base_price: number;
  duration: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  providerId: string;
  providerName: string;
  primaryColor: string;
}

export function BookingSheet({ open, onOpenChange, services, providerId, providerName, primaryColor }: Props) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [timeframe, setTimeframe] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [horseName, setHorseName] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setStep(1);
    setSelectedService(null);
    setTimeframe("");
    setName("");
    setPhone("");
    setHorseName("");
    setDsgvo(false);
    setSent(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !dsgvo) return;
    setSending(true);
    try {
      const msg = [
        selectedService ? `Service: ${selectedService.name}` : "",
        timeframe ? `Zeitraum: ${timeframe}` : "",
        horseName ? `Pferd: ${horseName}` : "",
      ].filter(Boolean).join("\n");

      await supabase.from("leads").insert({
        provider_id: providerId,
        name: name.trim(),
        phone: phone || null,
        message: msg || "Buchungsanfrage",
        lead_type: "termin",
        status: "neu",
        source: "booking_sheet",
      });
      setSent(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const timeframes = [
    { id: "diese-woche", label: "Diese Woche" },
    { id: "naechste-woche", label: "Nächste Woche" },
    { id: "flexibel", label: "Flexibel" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">
            {sent ? "Anfrage gesendet!" : step === 1 ? "Service wählen" : step === 2 ? "Wunschzeitraum" : "Kontaktdaten"}
          </SheetTitle>
        </SheetHeader>

        {/* Progress */}
        {!sent && (
          <div className="flex gap-2 mt-4 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 h-1.5 rounded-full transition-colors" style={{ backgroundColor: s <= step ? primaryColor : "hsl(var(--muted))" }} />
            ))}
          </div>
        )}

        {sent ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: primaryColor }} />
            <p className="text-muted-foreground">{providerName} meldet sich bei dir!</p>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Schließen</Button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-3 pb-6">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(2); }}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  selectedService?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {s.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration} Min.</span>}
                    <span className="flex items-center gap-1 font-semibold" style={{ color: primaryColor }}>
                      <Euro className="h-3.5 w-3.5" />{s.base_price}€
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : step === 2 ? (
          <div className="space-y-3 pb-6">
            {timeframes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTimeframe(t.label); setStep(3); }}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  timeframe === t.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{t.label}</span>
                </div>
              </button>
            ))}
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Zurück</Button>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <Input placeholder="Dein Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Telefon *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Pferdename" value={horseName} onChange={(e) => setHorseName(e.target.value)} />
            <div className="flex items-start gap-2">
              <Checkbox checked={dsgvo} onCheckedChange={(v) => setDsgvo(!!v)} id="dsgvo-booking" />
              <label htmlFor="dsgvo-booking" className="text-xs text-muted-foreground leading-tight">
                Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu. *
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1"><ArrowLeft className="h-4 w-4" />Zurück</Button>
              <Button
                className="flex-1 gap-2"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
                onClick={handleSubmit}
                disabled={sending || !name.trim() || !dsgvo}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Anfrage senden
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
