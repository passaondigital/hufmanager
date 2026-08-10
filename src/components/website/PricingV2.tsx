import { Check, Users, Mic, Sparkles, ChevronDown, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADD_ON_STORAGE_PLANS } from "@/lib/hufi-storage-plans";

const includedFeatures = [
  "Terminkalender & smarte Tourenplanung",
  "Kunden- & Pferdeverwaltung",
  "Vollständige Pferdeakte & Befunde",
  "Rechnungen in Sekunden — PDF, E-Mail, fertig",
  "Hufi KI-Assistent & Sprachsteuerung",
  "Material-Verwaltung",
  "Offline-Modus & PWA",
  "DSGVO-konform · EU-Server",
];

const voicePacks = [
  { amount: "5€", label: "Einstieg" },
  { amount: "10€", label: "Meistgewählt" },
  { amount: "25€", label: "Vielnutzer" },
];

const guthabenBedingungen = [
  "Dein Guthaben ist 12 Monate ab dem Kauf gültig. Was du in der Zeit nicht aufbrauchst, verfällt danach.",
  "Keine Rückerstattung, keine Auszahlung, keine Übertragung — das Guthaben ist fest an deinen Account gebunden.",
  "Kündigst du dein Abo, kannst du ein vorhandenes Restguthaben trotzdem bis zum Ablaufdatum weiter nutzen.",
  "Du siehst jederzeit in deinem Account, wie viel Guthaben du noch hast und wofür du es verbraucht hast.",
  "Wir laden dein Guthaben nie automatisch nach — Auto-Topup gibt es nur, wenn du es selbst aktivierst.",
];

const PricingV2 = () => (
  <section id="pricing" className="py-20 md:py-28 bg-zinc-950">
    <div className="hufi-container-wide">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Preise</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">
            Einfach. Fair. Ohne Kleingedrucktes.
          </h2>
          <p className="text-white/60 text-base max-w-2xl mx-auto">
            Ein Preis, voller Zugang. Für Hufbearbeiter, Hufschmiede, Pferdeosteopathen, Reitlehrer,
            Stallbetreiber & alle Pferde-Profis.
          </p>
        </div>

        {/* Free for horse owners badge */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-primary/30 bg-primary/5">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-white font-medium">
              Pferdebesitzer nutzen Hufi <strong className="text-primary">immer kostenlos</strong>
            </span>
          </div>
        </div>

        {/* Early Bird Card */}
        <div className="rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/15 to-transparent p-7 sm:p-10 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Early Bird — begrenzte Plätze
          </div>

          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-5xl sm:text-6xl font-extrabold text-white">9,95€</span>
              <span className="text-white/40 text-base">/Monat</span>
            </div>
            <p className="text-white/40 text-sm">
              statt regulär <span className="line-through">29,95€</span>/Monat — Preis bleibt für dich, solange du dabei bleibst
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-xl mx-auto">
            {includedFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-black" />
                </div>
                <span className="text-white/80">{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-center gap-2 mb-2">
            <Button size="lg" className="font-bold glow-orange bg-primary hover:bg-primary/90 text-white w-full sm:w-auto sm:px-16" asChild>
              <a href="/auth">14 Tage kostenlos testen</a>
            </Button>
            <p className="text-white/30 text-xs">Keine Kreditkarte nötig · Monatlich kündbar · Kein Vertrag</p>
          </div>

          {/* Speicher — Produktbestandteil, technische Ablage folgt schrittweise */}
          <div className="mt-6 pt-5 border-t border-white/10 max-w-xl mx-auto">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white/80 text-sm font-medium">
                  5 GB Dokumenten- und Bildspeicher pro Nutzer inklusive
                </p>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  Die dauerhafte Ablage für Pferdeakten, Bilder und Dokumente wird schrittweise freigeschaltet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mehr Speicher bei Bedarf — Zusatzpakete in Vorbereitung, kein Checkout */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Mehr Speicher bei Bedarf</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Zusätzliche Speicherpakete für mehr Fotos, Dokumente und Pferdeakten — die genauen Konditionen
                legen wir fest, sobald die Ablage freigeschaltet ist.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {ADD_ON_STORAGE_PLANS.map((plan) => (
              <div key={plan.planId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                <p className="text-white font-extrabold text-xl">{plan.displayLabel}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full border border-white/10 text-white/40 text-[10px] uppercase tracking-wider">
                  In Vorbereitung
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Voice-Guthaben — optional add-on */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Voice-Guthaben — optional</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Für Premium-Sprachminuten (z.B. natürlichere Hey-Hufi-Stimme) kannst du dir jederzeit
                zusätzliches Guthaben aufladen. Komplett optional, nicht Voraussetzung für die Nutzung.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {voicePacks.map((p) => (
              <div key={p.amount} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                <p className="text-white font-extrabold text-xl">{p.amount}</p>
                <p className="text-white/40 text-xs mt-1">{p.label}</p>
              </div>
            ))}
          </div>

          <details className="group rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="text-white/70 text-sm font-medium">Guthaben-Bedingungen</span>
              <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180 flex-shrink-0" />
            </summary>
            <ul className="px-4 pb-4 space-y-2.5">
              {guthabenBedingungen.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-white/50 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* Tax Notice */}
        <div className="mt-8 max-w-3xl mx-auto rounded-xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Hinweis zur Umsatzsteuer</h3>
          <div className="text-white/50 text-sm space-y-2 leading-relaxed">
            <p>
              Alle Preise beziehen sich auf monatliche Abonnements für Profis (Hufbearbeiter, Hufschmiede,
              Pferdeosteopathen, Physiotherapeuten, Reitlehrer, Trainer & weitere Pferde-Profis).
              Pferdebesitzer nutzen Hufi <strong className="text-white/70">immer kostenlos</strong>.
            </p>
            <p>
              Hufi ist als Kleinunternehmer nach <strong className="text-white/70">§ 19 UStG</strong> tätig.
              Es wird keine Umsatzsteuer erhoben — die Preise sind Endpreise.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PricingV2;
