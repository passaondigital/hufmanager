import { Check, X, Play, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "9,90",
    horses: "1–10 Pferde",
    highlight: false,
    features: {
      "Basis-Dokumentation": true,
      "Terminplanung": true,
      "Kommunikation mit Pferdebesitzern": true,
      "1 Nutzer": true,
      "Offline-Modus": true,
      "DSGVO-konform": true,
      "KI-Features & AutoFlow": false,
      "Vorlagen & PDF/Export": false,
      "Prioritäts-Support": false,
      "2. Benutzer / Team": false,
      "Gemeinsame Doku & interne Notizen": false,
      "Rollen & Auswertungen": false,
    },
  },
  {
    name: "Pro",
    price: "29",
    horses: "11–75 Pferde",
    highlight: true,
    features: {
      "Basis-Dokumentation": true,
      "Terminplanung": true,
      "Kommunikation mit Pferdebesitzern": true,
      "1 Nutzer": true,
      "Offline-Modus": true,
      "DSGVO-konform": true,
      "KI-Features & AutoFlow": true,
      "Vorlagen & PDF/Export": true,
      "Prioritäts-Support": true,
      "2. Benutzer / Team": false,
      "Gemeinsame Doku & interne Notizen": false,
      "Rollen & Auswertungen": false,
    },
  },
  {
    name: "Duo",
    price: "49",
    horses: "76–150 Pferde",
    highlight: false,
    features: {
      "Basis-Dokumentation": true,
      "Terminplanung": true,
      "Kommunikation mit Pferdebesitzern": true,
      "1 Nutzer": true,
      "Offline-Modus": true,
      "DSGVO-konform": true,
      "KI-Features & AutoFlow": true,
      "Vorlagen & PDF/Export": true,
      "Prioritäts-Support": true,
      "2. Benutzer / Team": true,
      "Gemeinsame Doku & interne Notizen": true,
      "Rollen & Auswertungen": false,
    },
  },
  {
    name: "Team",
    price: "79",
    horses: "151+ Pferde (Open End)",
    highlight: false,
    features: {
      "Basis-Dokumentation": true,
      "Terminplanung": true,
      "Kommunikation mit Pferdebesitzern": true,
      "1 Nutzer": true,
      "Offline-Modus": true,
      "DSGVO-konform": true,
      "KI-Features & AutoFlow": true,
      "Vorlagen & PDF/Export": true,
      "Prioritäts-Support": true,
      "2. Benutzer / Team": true,
      "Gemeinsame Doku & interne Notizen": true,
      "Rollen & Auswertungen": true,
    },
  },
];

const featureKeys = Object.keys(plans[0].features);

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

        {/* Plan Cards (Mobile) */}
        <div className="md:hidden space-y-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-primary bg-gradient-to-b from-primary/15 to-transparent"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="flex items-center gap-1 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                  <Star className="w-3.5 h-3.5 fill-primary" /> Beliebtester Plan
                </div>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                <span className="text-white/40">/Monat</span>
              </div>
              <p className="text-primary/80 text-sm font-medium mb-5">Empfohlen für {plan.horses}</p>
              <ul className="space-y-2 mb-6">
                {featureKeys.map((f) => {
                  const has = (plan.features as Record<string, boolean>)[f];
                  return (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      {has ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                          <X className="w-3 h-3 text-white/20" />
                        </div>
                      )}
                      <span className={has ? "text-white/80" : "text-white/30"}>{f}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                size="lg"
                className={`w-full font-bold ${
                  plan.highlight ? "glow-orange bg-primary hover:bg-primary/90 text-white" : ""
                }`}
                variant={plan.highlight ? "default" : "outline"}
                asChild
              >
                <a href="#demo">Demo ansehen</a>
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Table (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 text-white/50 text-sm font-medium w-[240px]">Features</th>
                {plans.map((plan) => (
                  <th key={plan.name} className="py-4 px-4 text-center">
                    <div className="relative">
                      {plan.highlight && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <Star className="w-3 h-3 fill-primary" /> Beliebt
                        </span>
                      )}
                      <div className="text-white font-bold text-lg">{plan.name}</div>
                      <div className="flex items-baseline justify-center gap-1 mt-1">
                        <span className="text-2xl font-extrabold text-white">{plan.price}€</span>
                        <span className="text-white/40 text-sm">/Mo.</span>
                      </div>
                      <p className="text-primary/70 text-xs font-medium mt-1">{plan.horses}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((feature, i) => (
                <tr key={feature} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                  <td className="py-3 px-4 text-white/70 text-sm">{feature}</td>
                  {plans.map((plan) => {
                    const has = (plan.features as Record<string, boolean>)[feature];
                    return (
                      <td key={plan.name} className="py-3 px-4 text-center">
                        {has ? (
                          <div className="inline-flex w-6 h-6 rounded-full bg-primary/20 items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : (
                          <div className="inline-flex w-6 h-6 rounded-full bg-white/5 items-center justify-center">
                            <X className="w-3 h-3 text-white/15" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* CTA row */}
              <tr>
                <td className="py-6 px-4" />
                {plans.map((plan) => (
                  <td key={plan.name} className="py-6 px-4 text-center">
                    <Button
                      size="lg"
                      className={`font-bold ${
                        plan.highlight ? "glow-orange bg-primary hover:bg-primary/90 text-white" : ""
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                      asChild
                    >
                      <a href="#demo">
                        <Play className="mr-1.5 h-4 w-4" />
                        Demo
                      </a>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
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
