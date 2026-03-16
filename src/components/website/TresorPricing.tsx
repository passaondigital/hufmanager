import { useState } from "react";
import { Check, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const FEATURES = [
  "PIN-geschützter Safe pro Pferd",
  "QR-Notfall-Code pro Pferd",
  "Unbegrenzte Dokumente",
  "AKU-Mappe PDF-Export",
  "Besitzerwechsel-Funktion",
  "Verschlüsselte Speicherung",
];

const PLANS = [
  {
    name: "Light",
    horses: "1–3 Pferde",
    monthly: 2.99,
    yearly: 29.9,
    yearlySave: 6,
    highlight: false,
    cta: "Tresor aktivieren",
    // TODO: Replace with CopeCart checkout URLs
    // Light Monthly: https://www.copecart.com/products/XXXXX/checkout
    href: "/auth",
  },
  {
    name: "Pro",
    horses: "4–10 Pferde",
    monthly: 7.99,
    yearly: 79.9,
    yearlySave: 16,
    highlight: true,
    cta: "Tresor aktivieren",
    // TODO: Replace with CopeCart checkout URLs
    // Pro Monthly: https://www.copecart.com/products/XXXXX/checkout
    href: "/auth",
  },
  {
    name: "Gestüt",
    horses: "11–50 Pferde",
    monthly: 14.99,
    yearly: 149.9,
    yearlySave: 30,
    highlight: false,
    cta: "Tresor aktivieren",
    // TODO: Replace with CopeCart checkout URLs
    // Gestüt Monthly: https://www.copecart.com/products/XXXXX/checkout
    href: "/auth",
  },
  {
    name: "Unlimited",
    horses: "50+ Pferde",
    monthly: 24.99,
    yearly: 249.9,
    yearlySave: 50,
    highlight: false,
    cta: "Anfrage senden",
    href: "mailto:info@hufmanager.de",
  },
];

function formatPrice(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export default function TresorPricing() {
  const [yearly, setYearly] = useState(false);

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
            return (
              <div
                key={plan.name}
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
                  <a
                    href={plan.href}
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
                    {plan.cta}
                  </a>
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
    </section>
  );
}
