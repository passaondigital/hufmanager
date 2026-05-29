import { useState } from "react";
import { Check, Star, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FEATURES = [
  "PIN-geschützter Safe pro Pferd",
  "QR-Notfall-Code pro Pferd",
  "Unbegrenzte Dokumente",
  "AKU-Mappe PDF-Export",
  "Besitzerwechsel-Funktion",
  "Verschlüsselte Speicherung",
];

type PlanId = "light" | "pro" | "gestuet" | "unlimited";

interface CopecartUrls {
  monthly: string | null;
  yearly: string | null;
}

// CopeCart-Checkout-URLs.
// Wenn beide Slots null sind → Waitlist-Modus (Produkt noch nicht in CopeCart).
// Wenn URLs gesetzt sind → direkter Checkout, Waitlist-Dialog erscheint nicht mehr.
const COPECART_URLS: Record<PlanId, CopecartUrls> = {
  light:     { monthly: null, yearly: null },
  pro:       { monthly: null, yearly: null },
  gestuet:   { monthly: null, yearly: null },
  unlimited: { monthly: null, yearly: null },
};

interface Plan {
  id: PlanId;
  name: string;
  horses: string;
  monthly: number;
  yearly: number;
  yearlySave: number;
  highlight: boolean;
}

const PLANS: Plan[] = [
  { id: "light",     name: "Light",     horses: "1–3 Pferde",   monthly: 2.99,  yearly: 29.9,  yearlySave: 6,  highlight: false },
  { id: "pro",       name: "Pro",       horses: "4–10 Pferde",  monthly: 7.99,  yearly: 79.9,  yearlySave: 16, highlight: true },
  { id: "gestuet",   name: "Gestüt",    horses: "11–50 Pferde", monthly: 14.99, yearly: 149.9, yearlySave: 30, highlight: false },
  { id: "unlimited", name: "Unlimited", horses: "50+ Pferde",   monthly: 24.99, yearly: 249.9, yearlySave: 50, highlight: false },
];

function formatPrice(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function generateRef() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export default function TresorPricing() {
  const [yearly, setYearly] = useState(false);
  const [waitlistPlan, setWaitlistPlan] = useState<Plan | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const cycle: keyof CopecartUrls = yearly ? "yearly" : "monthly";

  const openCheckoutOrWaitlist = (plan: Plan) => {
    const url = COPECART_URLS[plan.id][cycle];
    if (url) {
      window.location.href = url;
      return;
    }
    setWaitlistPlan(plan);
    setWaitlistEmail("");
    setWaitlistName("");
    setWaitlistSuccess(false);
    setWaitlistError(null);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPlan) return;
    const email = waitlistEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistError("Bitte gib eine gültige E-Mail ein.");
      return;
    }
    setWaitlistSubmitting(true);
    setWaitlistError(null);

    const planLabel = `tresor_${waitlistPlan.id}_${cycle}`;

    const { error } = await supabase.from("pferdeakte_waitlist").insert({
      name: waitlistName.trim().substring(0, 80) || "Tresor-Interessent",
      email: email.substring(0, 255),
      role: planLabel,
      referral_code: generateRef(),
    });

    setWaitlistSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setWaitlistSuccess(true);
        toast.success("Du bist bereits auf der Warteliste — wir melden uns beim Launch.");
        return;
      }
      setWaitlistError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      return;
    }

    setWaitlistSuccess(true);
    toast.success("Du stehst auf der Tresor-Warteliste.");
  };

  return (
    <section
      id="tresor-pricing"
      className="py-20 md:py-28"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-10">
          <span
            className="text-xs font-bold uppercase tracking-[.2em]"
            style={{ color: "#F5970A" }}
          >
            Tresor-Pläne
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">
            Dein Tresor. Dein Preis.
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,.5)" }}>
            Wähle den Plan der zu deinem Stall passt. Jederzeit kündbar.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className="text-sm font-semibold"
            style={{ color: yearly ? "rgba(255,255,255,.4)" : "#fff" }}
          >
            Monatlich
          </span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span
            className="text-sm font-semibold"
            style={{ color: yearly ? "#fff" : "rgba(255,255,255,.4)" }}
          >
            Jährlich
          </span>
          {yearly && (
            <span
              className="ml-2 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,151,10,.15)", color: "#F5970A" }}
            >
              Spare bis zu 50€
            </span>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {PLANS.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            const period = yearly ? "/Jahr" : "/Monat";
            const hasCheckout = COPECART_URLS[plan.id][cycle] !== null;
            const cta = hasCheckout ? "Tresor aktivieren" : "Auf Warteliste";
            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  border: plan.highlight
                    ? "2px solid #F5970A"
                    : "1px solid rgba(255,255,255,.1)",
                  background: plan.highlight
                    ? "linear-gradient(180deg, rgba(245,151,10,.12) 0%, transparent 60%)"
                    : "rgba(255,255,255,.02)",
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-black"
                    style={{ backgroundColor: "#F5970A" }}
                  >
                    <Star className="w-3 h-3 fill-black" /> Beliebt
                  </div>
                )}

                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm font-medium mt-1" style={{ color: "rgba(245,151,10,.8)" }}>
                  {plan.horses}
                </p>

                <div className="flex items-baseline gap-1 mt-4 mb-1">
                  <span className="text-4xl font-extrabold" style={{ color: "#F5970A" }}>
                    {formatPrice(price)}€
                  </span>
                  <span style={{ color: "rgba(255,255,255,.4)" }}>{period}</span>
                </div>

                {yearly && (
                  <span
                    className="text-xs font-semibold mb-4"
                    style={{ color: "#22c55e" }}
                  >
                    Spare {plan.yearlySave}€
                  </span>
                )}
                {!yearly && <div className="mb-4" />}

                <div className="mt-auto">
                  <button
                    type="button"
                    onClick={() => openCheckoutOrWaitlist(plan)}
                    className="block w-full text-center text-sm font-bold py-3 rounded-lg transition-all hover:brightness-110"
                    style={
                      plan.highlight
                        ? { backgroundColor: "#F5970A", color: "#fff" }
                        : {
                            border: "1px solid rgba(255,255,255,.2)",
                            color: "#fff",
                            backgroundColor: "transparent",
                          }
                    }
                  >
                    {cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 max-w-3xl mx-auto mb-10">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#F5970A" }}
              >
                <Check className="w-3 h-3 text-black" />
              </div>
              <span style={{ color: "rgba(255,255,255,.75)" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Trust Note */}
        <p
          className="text-center text-sm max-w-xl mx-auto"
          style={{ color: "rgba(255,255,255,.35)" }}
        >
          Deine Daten bleiben auch nach Kündigung 12 Monate lesbar. Nichts geht verloren. Jederzeit kündbar.
        </p>
      </div>

      <Dialog open={!!waitlistPlan} onOpenChange={(open) => !open && setWaitlistPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {waitlistPlan ? `Tresor ${waitlistPlan.name} – Warteliste` : "Warteliste"}
            </DialogTitle>
          </DialogHeader>

          {waitlistSuccess ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Du stehst auf der Warteliste für{" "}
                <strong>{waitlistPlan?.name}</strong> ({yearly ? "Jährlich" : "Monatlich"}).
                Wir benachrichtigen dich, sobald die Bezahl-Aktivierung live ist.
              </p>
              <Button className="w-full" onClick={() => setWaitlistPlan(null)}>
                Schließen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Wir aktivieren die Bezahlung in Kürze. Trag dich ein, dann melden wir uns
                zum Launch.
              </p>
              <Input
                placeholder="Vorname (optional)"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                maxLength={80}
              />
              <Input
                type="email"
                placeholder="Deine E-Mail-Adresse *"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
                maxLength={255}
              />
              {waitlistError && (
                <p className="text-sm text-destructive">{waitlistError}</p>
              )}
              <Button type="submit" disabled={waitlistSubmitting} className="w-full">
                {waitlistSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Auf Warteliste setzen
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
