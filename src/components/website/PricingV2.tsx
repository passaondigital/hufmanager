import { Check, X, Play, Users, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    id: "go",
    name: "GO",
    tagline: "Einsteigen & loslegen",
    price: "9,90",
    horses: "Bis 10 Pferde",
    highlight: false,
    users: "1 Nutzer",
    checkoutUrl: "https://www.copecart.com/products/8ef10f74/checkout?utm_source=landingpage&utm_medium=pricing&utm_campaign=direktkauf",
    forWhom: "Für Einsteiger & Nebenberufliche",
    includes: [
      "Terminkalender & Tourenplanung",
      "Kunden- & Pferdeverwaltung",
      "Pferdeakte & Befunde",
      "Rechnungen & Buchhaltung",
      "Offline-Modus & PWA",
      "DSGVO-konform · EU-Server",
      "Kunden-App für Pferdebesitzer",
    ],
    excludes: [
      "Netzwerk & Hufi Connect",
      "KI-Features & Sprachsteuerung",
      "Huf-Analyse KI (HufCam)",
      "Material-Verwaltung",
      "Mehrere Benutzer",
    ],
  },
  {
    id: "balance",
    name: "BALANCE",
    tagline: "Professionell & effizient",
    price: "29",
    horses: "Bis 75 Pferde",
    highlight: true,
    users: "1 Nutzer",
    checkoutUrl: "https://www.copecart.com/products/1996da6f/checkout?utm_source=landingpage&utm_medium=pricing&utm_campaign=direktkauf",
    forWhom: "Für aktive Dienstleister",
    includes: [
      "Alles aus GO",
      "Hufi KI & Sprachsteuerung",
      "Proaktives Tages-Briefing",
      "AutoFlow — Sprache wird Befund",
      "Huf-Analyse KI (HufCam Pro)",
      "Material-Verwaltung",
      "Netzwerk & Hufi Connect",
      "Vorlagen & PDF-Export",
      "Prioritäts-Support",
    ],
    excludes: [
      "Mehrere Benutzer",
      "Team-Management",
    ],
  },
  {
    id: "intensiv",
    name: "INTENSIV",
    tagline: "Vollumfänglich & für Teams",
    price: "79",
    horses: "Unbegrenzt",
    highlight: false,
    users: "Unbegrenzte Nutzer",
    checkoutUrl: "https://www.copecart.com/products/badae7d2/checkout?utm_source=landingpage&utm_medium=pricing&utm_campaign=direktkauf",
    forWhom: "Für Teams & Stallbetriebe",
    includes: [
      "Alles aus BALANCE",
      "Unbegrenzte Nutzer & Rollen",
      "Team-Kalender & geteilte Doku",
      "Mitarbeiter-Verwaltung",
      "Team-Auswertungen & Statistiken",
      "DATEV-Export",
      "Persönlicher Onboarding-Support",
    ],
    excludes: [],
  },
];

const PricingV2 = () => (
  <section id="pricing" className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Preise</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">
            Einfach. Transparent. Fair.
          </h2>
          <p className="text-white/60 text-base max-w-2xl mx-auto">
            Für Hufbearbeiter, Hufschmiede, Pferdeosteopathen, Reitlehrer, Stallbetreiber & alle Pferde-Profis.
            <br className="hidden sm:block" />Monatlich kündbar — kein Vertrag, kein Risiko.
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

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col relative ${
                plan.highlight
                  ? "border-primary bg-gradient-to-b from-primary/15 to-transparent"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 fill-black" /> Beliebt
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-black text-white tracking-tight">{plan.name}</h3>
                  {plan.highlight && <Zap className="w-4 h-4 text-primary fill-primary" />}
                </div>
                <p className="text-white/40 text-xs">{plan.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                <span className="text-white/40 text-sm">/Monat</span>
              </div>
              <p className="text-primary/80 text-sm font-semibold mb-0.5">{plan.horses}</p>
              <p className="text-white/30 text-xs mb-1">{plan.users}</p>
              <div className="mb-5 mt-1">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
                  {plan.forWhom}
                </span>
              </div>

              <ul className="space-y-2 mb-4 flex-1">
                {plan.includes.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
                {plan.excludes.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                      <X className="w-3 h-3 text-white/20" />
                    </div>
                    <span className="text-white/25">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 mt-auto">
                <Button
                  size="lg"
                  className={`w-full font-bold ${
                    plan.highlight ? "glow-orange bg-primary hover:bg-primary/90 text-white" : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                  asChild
                >
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    Jetzt starten
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-white/50 hover:text-white text-xs"
                  asChild
                >
                  <a href="/auth">
                    <Play className="mr-1 h-3 w-3" />
                    14 Tage kostenlos testen
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Tax Notice */}
        <div className="mt-12 max-w-3xl mx-auto rounded-xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
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

        <div className="text-center mt-8 space-y-2">
          <p className="text-white/50 text-sm font-medium">
            Alle Pläne: 14 Tage kostenlos. Keine Kreditkarte. Kündigung per E-Mail.
          </p>
          <p className="text-white/30 text-xs">
            Monatlich kündbar · Kein Vertrag · Kein Risiko
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default PricingV2;
