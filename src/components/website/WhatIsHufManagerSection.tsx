import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Check, X } from "lucide-react";

const includeItems = [
  { icon: "🗓️", text: "Terminplanung & Kalender" },
  { icon: "🗺️", text: "Routenoptimierung & Navigation" },
  { icon: "📋", text: "Digitale Pferdeakte" },
  { icon: "🔨", text: "Huf-Dokumentation mit Fotos" },
  { icon: "🧾", text: "Rechnungsstellung & DATEV-Export" },
  { icon: "📱", text: "Kostenlose Kunden-App" },
  { icon: "👥", text: "Team & Mitarbeiterverwaltung" },
  { icon: "🤝", text: "Fachpartner-Anbindung" },
  { icon: "🤖", text: "KI-Assistent Hufi" },
  { icon: "📶", text: "Offline-fähig im Stall" },
];

const excludeItems = [
  "Kein Ersatz für DATEV oder lexoffice",
  "Keine stationäre Praxis-Software",
  "Kein komplexes ERP für 50+ Mitarbeiter",
  "Keine Google-Alternative für Navigation — ergänzt sie nur DSGVO-konform",
  "Keine Buchhaltungspflicht-Software",
  "Nicht für außerhalb DACH — internationale Märkte folgen",
];

const WhatIsHufiSection = () => {
  const { ref: headerRef, revealed: headerRevealed } = useScrollReveal();
  const { ref: leftRef, revealed: leftRevealed } = useScrollReveal();
  const { ref: rightRef, revealed: rightRevealed } = useScrollReveal();
  const { ref: footerRef, revealed: footerRevealed } = useScrollReveal();

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container max-w-5xl px-4">
        {/* Header */}
        <div
          ref={headerRef}
          className="text-center mb-12 md:mb-16 transition-all duration-700"
          style={{
            opacity: headerRevealed ? 1 : 0,
            transform: headerRevealed ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-zinc-900 mb-4">
            Eine App. Alles drin.
          </h2>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto">
            Hufi ist dein digitales Cockpit —
            <br className="hidden md:block" />
            vom ersten Termin bis zur bezahlten Rechnung.
          </p>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left — What it is */}
          <div
            ref={leftRef}
            className="transition-all duration-700 delay-100"
            style={{
              opacity: leftRevealed ? 1 : 0,
              transform: leftRevealed ? "translateY(0)" : "translateY(24px)",
            }}
          >
            <h3 className="text-xl font-bold text-zinc-900 mb-6">
              Was Hufi ist:
            </h3>
            <ul className="space-y-3">
              {includeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-zinc-700">
                    <span className="mr-2">{item.icon}</span>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — What it's not */}
          <div
            ref={rightRef}
            className="transition-all duration-700 delay-200"
            style={{
              opacity: rightRevealed ? 1 : 0,
              transform: rightRevealed ? "translateY(0)" : "translateY(24px)",
            }}
          >
            <h3 className="text-xl font-bold text-zinc-900 mb-6">
              Was Hufi nicht ist:
            </h3>
            <ul className="space-y-3">
              {excludeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-400 line-through">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer line */}
        <div
          ref={footerRef}
          className="mt-12 md:mt-16 transition-all duration-700 delay-300"
          style={{
            opacity: footerRevealed ? 1 : 0,
            transform: footerRevealed ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <hr className="border-zinc-200 mb-6" />
          <p className="text-center text-zinc-500 text-base md:text-lg">
            Hufi ergänzt was du hast —
            <br />
            und ersetzt was dich aufhält.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhatIsHufiSection;
