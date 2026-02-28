import { Check, X, Play, Users, Star, MessageSquare, Package, UserPlus, Wrench, BarChart3, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Die 5 A's des Workflows
const FIVE_AS = [
  {
    number: 1,
    name: "Anfragen",
    icon: MessageSquare,
    description: "Leads, Posteingang & Kundenkommunikation",
  },
  {
    number: 2,
    name: "Angebote",
    icon: Package,
    description: "Leistungskatalog, Pakete & Preisgestaltung",
  },
  {
    number: 3,
    name: "Aufnahme",
    icon: UserPlus,
    description: "Kunden- & Pferde-Akten, Dokumentation",
  },
  {
    number: 4,
    name: "Auffassen",
    icon: Wrench,
    description: "Termine, Touren, HufCam & Durchführung",
  },
  {
    number: 5,
    name: "Analyse",
    icon: BarChart3,
    description: "Rechnungen, DATEV-Export & Statistiken",
  },
];

// Inklusive: 1. Hilfe Kunden Center
const HILFE_CENTER_FEATURE = {
  icon: LifeBuoy,
  name: "1. Hilfe Kunden Center",
  description: "Login-Hilfe, OTP-Codes, Zuordnungen reparieren & SOS-Support – direkt in der App.",
};

const plans = [
  {
    name: "Starter",
    price: "9,90",
    horses: "1–10 Pferde",
    highlight: false,
    users: "1 Nutzer",
    includes: [
      "Alle 5 Workflow-Stufen",
      "Offline-Modus & PWA",
      "DSGVO-konform",
      "Kunden-App kostenlos",
      "1. Hilfe Kunden Center",
    ],
    excludes: [
      "KI-Features & AutoFlow",
      "Vorlagen & PDF/Export",
      "2. Benutzer",
      "Team-Management",
    ],
  },
  {
    name: "Pro",
    price: "29",
    horses: "11–75 Pferde",
    highlight: true,
    users: "1 Nutzer",
    includes: [
      "Alle 5 Workflow-Stufen",
      "KI-Features & AutoFlow",
      "Vorlagen & PDF/Export",
      "Prioritäts-Support",
      "Offline-Modus & PWA",
      "DSGVO-konform",
      "1. Hilfe Kunden Center",
    ],
    excludes: [
      "2. Benutzer",
      "Team-Management",
    ],
  },
  {
    name: "Duo",
    price: "49",
    horses: "76–150 Pferde",
    highlight: false,
    users: "2 Nutzer",
    includes: [
      "Alles aus Pro",
      "2. Benutzer inklusive",
      "Gemeinsame Doku & Notizen",
      "Geteilte Kalender",
      "1. Hilfe Kunden Center",
    ],
    excludes: [
      "Unbegrenzte Nutzer",
      "Rollen & Auswertungen",
    ],
  },
  {
    name: "Team",
    price: "79",
    horses: "151+ Pferde",
    highlight: false,
    users: "Unbegrenzt",
    includes: [
      "Alles aus Duo",
      "Unbegrenzte Nutzer",
      "Rollen & Berechtigungen",
      "Team-Auswertungen",
      "Mitarbeiter-Verwaltung",
      "1. Hilfe Kunden Center",
    ],
    excludes: [],
  },
];

const PricingV2 = () => (
  <section id="pricing" className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Preise</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">
            Einfach. Transparent. Fair.
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Für Hufbearbeiter, Pferdeosteopathen, Physiotherapeuten, Trainer & alle Pferde-Profis.
            <br />Monatlich kündbar – kein Vertrag, kein Risiko.
          </p>
        </div>

        {/* Free for horse owners badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-primary/30 bg-primary/5">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-white font-medium">
              Pferdebesitzer nutzen HufManager <strong className="text-primary">kostenlos</strong>
            </span>
          </div>
        </div>

        {/* 5As Workflow Glossar */}
        <div className="mb-14">
          <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest text-center mb-6">
            Dein Workflow – Die 5 A's
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {FIVE_AS.map((a) => (
              <div
                key={a.name}
                className="flex flex-col items-center text-center p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                  <span className="text-primary font-extrabold text-sm">{a.number}</span>
                </div>
                <span className="text-white font-bold text-sm">{a.name}</span>
                <span className="text-white/40 text-[11px] mt-1 leading-tight">{a.description}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-3">
            Alle Pläne enthalten den vollständigen 5A-Workflow. Unterschied: Pferde-Limit, KI & Teamgröße.
          </p>

          {/* 1. Hilfe Kunden Center Highlight */}
          <div className="mt-6 flex items-center gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <HILFE_CENTER_FEATURE.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-white font-bold text-sm">{HILFE_CENTER_FEATURE.name}</span>
              <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{HILFE_CENTER_FEATURE.description}</p>
              <span className="text-primary text-[10px] font-semibold uppercase tracking-wider">In allen Plänen inklusive</span>
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? "border-primary bg-gradient-to-b from-primary/15 to-transparent relative"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 fill-black" /> Beliebt
                </div>
              )}

              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                <span className="text-white/40">/Monat</span>
              </div>
              <p className="text-primary/80 text-sm font-medium">{plan.horses}</p>
              <p className="text-white/40 text-xs mb-5">{plan.users}</p>

              {/* Included */}
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
                    <span className="text-white/30">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className={`w-full font-bold mt-auto ${
                  plan.highlight ? "glow-orange bg-primary hover:bg-primary/90 text-white" : ""
                }`}
                variant={plan.highlight ? "default" : "outline"}
                asChild
              >
                <a href="#demo">
                  <Play className="mr-1.5 h-4 w-4" />
                  Demo ansehen
                </a>
              </Button>
            </div>
          ))}
        </div>

        {/* Tax Notice */}
        <div className="mt-12 max-w-3xl mx-auto rounded-xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Hinweis zur Umsatzsteuer</h3>
          <div className="text-white/50 text-sm space-y-2 leading-relaxed">
            <p>
              Alle Preise beziehen sich auf monatliche Abonnements für Profis (Hufbearbeiter, Pferdeosteopathen,
              Physiotherapeuten, Trainer & weitere Pferde-Profis). Pferdebesitzer nutzen die HufManager-App
              weiterhin <strong className="text-white/70">kostenlos</strong>.
            </p>
            <p>
              HufManager ist als Kleinunternehmer nach <strong className="text-white/70">§ 19 UStG</strong> tätig.
              Aus diesem Grund wird keine Umsatzsteuer (Mehrwertsteuer) auf die Preise erhoben. Die Preise für
              Profis verstehen sich netto – Endverbraucher zahlen keine gesonderte Umsatzsteuer.
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          14 Tage kostenlos testen · Monatlich kündbar · Keine Kreditkarte nötig
        </p>
      </div>
    </div>
  </section>
);

export default PricingV2;
