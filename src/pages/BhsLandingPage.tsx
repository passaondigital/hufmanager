import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  MapPin,
  Repeat2,
  Star,
  Phone,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

// Pascals WhatsApp-Nummer (internationales Format ohne + oder Leerzeichen)
const WHATSAPP_NUMBER = "49105209007017";

// Provider-ID für Leads
const BHS_PROVIDER_ID = "99e50f7f-c2d1-4ce4-ba99-d7dc800e5090";

const PRICES: Record<number, Record<number, number>> = {
  4: { 1: 71.10, 2: 87.48 },
  6: { 1: 53.44, 2: 60.56 },
  8: { 1: 41.56, 2: 47.10 },
};

const ZONE_LABELS: Record<number, string> = {
  1: "Zone 1 — bis 25 km",
  2: "Zone 2 — 25 bis 50 km",
};

const INTERVAL_LABELS: Record<number, string> = {
  4: "Alle 4 Wochen",
  6: "Alle 6 Wochen",
  8: "Alle 8 Wochen",
};

const LEISTUNGEN = [
  "Professionelle Hufbearbeitung nach dem Barhufkonzept",
  "Dokumentation in der digitalen Pferdeakte",
  "Feste Intervalle — kein Terminsuchen mehr",
  "Erinnerung vor jedem Termin",
  "Direkte Erreichbarkeit per WhatsApp",
  "Jederzeit kündbar mit 4 Wochen Frist",
];

const TESTIMONIALS = [
  {
    name: "Sabrina H.",
    region: "Raum Würzburg",
    quote: "Seit wir das BHS Balance Abo haben weiß ich genau wann Pascal kommt. Keine nervöse Terminsuche mehr — einfach verlässlich.",
  },
  {
    name: "Markus B.",
    region: "Main-Spessart",
    quote: "Meine Stute hat endlich einen festen Rhythmus. Das merkt man ihr an — ruhiger, ausgeglichener. Kann ich nur empfehlen.",
  },
  {
    name: "Tanja K.",
    region: "Landkreis Miltenberg",
    quote: "Die Pferdeakte nach jedem Termin ist Gold wert. Ich sehe genau was gemacht wurde und kann das beim Tierarzt vorzeigen.",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

// ── Preisrechner ────────────────────────────────────────────────────────────

function PriceCalculator({ onSelectCta }: { onSelectCta: (interval: number, zone: number) => void }) {
  const [interval, setInterval] = useState<number>(6);
  const [zone, setZone] = useState<number>(1);
  const price = PRICES[interval][zone];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5 max-w-md mx-auto">
      <h3 className="text-lg font-bold text-gray-900 text-center">Dein Monatsbeitrag berechnen</h3>

      {/* Intervall */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Bearbeitungsintervall</Label>
        <div className="grid grid-cols-3 gap-2">
          {[4, 6, 8].map((w) => (
            <button
              key={w}
              onClick={() => setInterval(w)}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                interval === w
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
              )}
            >
              {w} Wochen
            </button>
          ))}
        </div>
      </div>

      {/* Zone */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Zone / Fahrtweg</Label>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium border transition-all text-left",
                zone === z
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
              )}
            >
              <span className="block font-semibold">Zone {z}</span>
              <span className={cn("text-xs", zone === z ? "text-amber-100" : "text-gray-400")}>
                {z === 1 ? "bis 25 km" : "25–50 km"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preis */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
        <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">Dein Monatsbeitrag</p>
        <p className="text-4xl font-extrabold text-amber-700">{formatPrice(price)}</p>
        <p className="text-xs text-amber-600 mt-1">
          {INTERVAL_LABELS[interval]} · {ZONE_LABELS[zone]}
        </p>
      </div>

      <Button
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11"
        onClick={() => onSelectCta(interval, zone)}
      >
        Jetzt Platz sichern →
      </Button>
    </div>
  );
}

// ── Kontaktformular ─────────────────────────────────────────────────────────

interface LeadForm {
  name: string;
  phone: string;
  horse: string;
  location: string;
}

function ContactForm({ preInterval, preZone }: { preInterval?: number; preZone?: number }) {
  const [form, setForm] = useState<LeadForm>({ name: "", phone: "", horse: "", location: "" });
  const [submitted, setSubmitted] = useState(false);
  const [waLink, setWaLink] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const { error } = await supabase.from("leads").insert({
        provider_id: BHS_PROVIDER_ID,
        lead_type: "bhs_balance",
        name: data.name,
        phone: data.phone,
        source: "bhs_balance",
        message: `Pferd: ${data.horse} | Ort: ${data.location}`,
        metadata: {
          horse: data.horse,
          location: data.location,
          interval_weeks: preInterval ?? null,
          zone: preZone ?? null,
        },
      });
      if (error) throw error;
    },
    onSuccess: (_, data) => {
      const text = encodeURIComponent(
        `Hallo Pascal, ich interessiere mich für das BHS Balance Abo.\n\n` +
        `Name: ${data.name}\n` +
        `Pferd: ${data.horse}\n` +
        `Ort: ${data.location}\n` +
        (preInterval ? `Wunsch: ${preInterval}-Wochen-Intervall, Zone ${preZone}\n` : "") +
        `\nBitte melde dich bei mir. 🐴`
      );
      setWaLink(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`);
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold text-gray-900">Anfrage gesendet!</h3>
        <p className="text-gray-600 text-sm max-w-xs mx-auto">
          Pascal meldet sich innerhalb von 24 Stunden bei dir. Du kannst ihm auch direkt auf WhatsApp schreiben.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Phone className="h-4 w-4" />
          Direkt auf WhatsApp schreiben
        </a>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
    >
      {preInterval && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
          Gewählt: <strong>{INTERVAL_LABELS[preInterval]}</strong> · <strong>{ZONE_LABELS[preZone ?? 1]}</strong>
          {" "}·{" "}
          <strong>{formatPrice(PRICES[preInterval][preZone ?? 1])}/Monat</strong>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bhs-name">Dein Name *</Label>
          <Input
            id="bhs-name"
            required
            placeholder="Max Mustermann"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bhs-phone">Telefon / WhatsApp *</Label>
          <Input
            id="bhs-phone"
            required
            type="tel"
            placeholder="+49 170 000 0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bhs-horse">Name deines Pferdes *</Label>
          <Input
            id="bhs-horse"
            required
            placeholder="z.B. Luna"
            value={form.horse}
            onChange={(e) => setForm({ ...form, horse: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bhs-location">Stallort / PLZ *</Label>
          <Input
            id="bhs-location"
            required
            placeholder="z.B. Aschaffenburg"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11"
      >
        {mutation.isPending ? "Wird gesendet…" : "Kostenlos anfragen →"}
      </Button>

      {mutation.isError && (
        <p className="text-red-600 text-sm text-center">
          Etwas ist schiefgelaufen. Bitte versuche es erneut oder schreib direkt auf WhatsApp.
        </p>
      )}

      {/* DSGVO */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Mit dem Absenden stimmst du der Verarbeitung deiner Daten zur Bearbeitung deiner Anfrage zu.
        Deine Daten werden nicht an Dritte weitergegeben und nicht für Werbezwecke genutzt.
        Weitere Informationen findest du in unserer{" "}
        <a href="/datenschutz" className="underline hover:text-gray-600">Datenschutzerklärung</a>.
        Du kannst deine Einwilligung jederzeit widerrufen.
      </p>
    </form>
  );
}

// ── Hauptseite ──────────────────────────────────────────────────────────────

export default function BhsLandingPage() {
  const [ctaInterval, setCtaInterval] = useState<number | undefined>();
  const [ctaZone, setCtaZone] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);

  function handleCta(interval: number, zone: number) {
    setCtaInterval(interval);
    setCtaZone(zone);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("bhs-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-700 to-amber-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <Repeat2 className="h-4 w-4" />
            Hufpflege-Abo für Pferdebesitzer
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            BHS Balance —<br />Hufpflege-Abo für dein Pferd
          </h1>
          <p className="text-amber-100 text-lg max-w-xl mx-auto">
            Feste Intervalle. Keine Terminsuche. Professionelle Barhufbearbeitung durch Pascal Schmid —
            einfach, verlässlich, digital dokumentiert.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => document.getElementById("rechner")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white text-amber-800 font-semibold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Preis berechnen
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setTimeout(() => document.getElementById("bhs-form")?.scrollIntoView({ behavior: "smooth" }), 50);
              }}
              className="border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Jetzt anfragen
            </button>
          </div>
        </div>
      </section>

      {/* Leistungen */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Was im Abo enthalten ist</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {LEISTUNGEN.map((l) => (
              <div key={l} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preisrechner */}
      <section id="rechner" className="py-16 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Dein Monatsbeitrag</h2>
            <p className="text-gray-500 text-sm mt-2">
              Wähle Intervall und Zone — dein Beitrag erscheint sofort.
            </p>
          </div>
          <PriceCalculator onSelectCta={handleCta} />
          <div className="flex items-start gap-2 text-xs text-gray-400 max-w-md mx-auto">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Zone 1 bis 25 km Fahrtweg · Zone 2 bis 50 km ·
              Fahrtweg wird ab deinem Stallort berechnet.
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400 max-w-md mx-auto">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Mehraufwand (stark überwachsene Hufe, Erstbearbeitungen) wird separat besprochen und einmalig in Rechnung gestellt.
            </span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-amber-900 text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Was Pferdebesitzer sagen</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-amber-100 text-sm leading-relaxed">„{t.quote}"</p>
                <div className="pt-2 border-t border-white/10">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-amber-300 text-xs">{t.region}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontaktformular */}
      <section id="bhs-form" className="py-16 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Platz für dein Pferd sichern</h2>
            <p className="text-gray-500 text-sm mt-2">
              Kurze Anfrage — Pascal meldet sich innerhalb von 24 Stunden.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <ContactForm preInterval={ctaInterval} preZone={ctaZone} />
          </div>

          {/* Vertrauen */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="h-4 w-4 text-gray-300" />
            <span>Keine Vorkasse · Kein Abo-Zwang bis zur Bestätigung · DSGVO-konform</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4 text-center text-xs text-gray-400 space-x-4">
        <span>© 2026 Barhufservice Schmid</span>
        <a href="/impressum" className="hover:text-gray-600">Impressum</a>
        <a href="/datenschutz" className="hover:text-gray-600">Datenschutz</a>
      </footer>
    </div>
  );
}
