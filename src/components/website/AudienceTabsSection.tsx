import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DataSovereigntyBadge } from "@/components/shared/DataSovereigntyBadge";

interface AudienceTab {
  id: string;
  icon: string;
  label: string;
  headline: string;
  subline: string;
  features: string[];
  price: string;
  ctaLabel: string;
  ctaLink: string;
  highlight?: { icon: string; title: string; text: string };
}

const TABS: AudienceTab[] = [
  {
    id: "provider",
    icon: "🔧",
    label: "Hufpfleger",
    headline: "Dein digitales Cockpit",
    subline: "Alles was dein Betrieb braucht — von der Tour bis zur Rechnung",
    features: [
      "Termine & Tourenplanung",
      "Digitale Pferdeakte",
      "Rechnungsstellung & Buchhaltung",
      "Kunden-App kostenlos für deine Kunden",
      "Team & Mitarbeiter verwalten",
      "KI-Assistent Hufi",
      "Offline im Stall",
      "DSGVO-konform, DE-Server",
    ],
    price: "ab 9,90€/Monat",
    ctaLabel: "Kostenlos testen →",
    ctaLink: "/auth?role=provider",
  },
  {
    id: "partner",
    icon: "🤝",
    label: "Fachpartner",
    headline: "Volle Funktions-Parität für Pferde-Profis",
    subline: "Für Tierärzte, Physiotherapeuten, Osteopathen, Trainer und alle Pferde-Profis — mit den gleichen operativen Tools wie der Hufbearbeiter",
    features: [
      "Termine & Tourenplanung mit Tour Manager",
      "Kalender & Kundenmanagement",
      "Rechnungsstellung & Buchhaltung (GuV, Ausgaben)",
      "AutoFlow — automatisierte Workflows",
      "Mein Office & Lager / Material",
      "Meine Website — eigener Webauftritt",
      "Zeit-Tracking & km-Tracker (Work-Mode)",
      "HM Connect — vernetzt im Ökosystem",
      "Fach-Templates & Behandlungspläne",
      "Befunde & Dokumente erstellen",
      "KI-Assistent & DSGVO-konform",
    ],
    price: "ab 9,90€/Monat",
    ctaLabel: "Als Partner registrieren →",
    ctaLink: "/auth?role=partner",
  },
  {
    id: "employee",
    icon: "👷",
    label: "Mitarbeiter",
    headline: "Dein digitaler Arbeitsbegleiter",
    subline: "Für Hufpflege-Assistenten, Gesellen und Teammitglieder",
    features: [
      "Zugewiesene Touren auf einen Blick",
      "Check-in / Check-out mit GPS",
      "Hufzustand dokumentieren & Fotos machen",
      "Auch offline im Stall",
      "Zeiterfassung",
      "Chat mit dem Chef",
      "Material verwalten",
    ],
    price: "Vom Provider eingeladen — kostenlos",
    ctaLabel: "Ich wurde eingeladen →",
    ctaLink: "/employee-invite",
  },
  {
    id: "client",
    icon: "🐴",
    label: "Pferdebesitzer",
    headline: "Dein Pferd. Deine Daten. Deine Kontrolle.",
    subline: "Immer informiert — was mit deinem Pferd passiert",
    features: [
      "Pferdeakte mit allen Befunden und Fotos",
      "Termine einsehen und anfragen",
      "Rechnungen herunterladen",
      "Chat mit deinem Hufpfleger",
      "Du entscheidest wer deine Daten sieht",
      "Kostenlos — immer",
    ],
    price: "Kostenlos für Pferdebesitzer",
    ctaLabel: "Jetzt kostenlos registrieren →",
    ctaLink: "/auth?role=client",
    highlight: {
      icon: "🛡️",
      title: "Du hast die Datenhoheit.",
      text: "Kein Tierarzt, kein Physiotherapeut, kein Mitarbeiter sieht dein Pferd ohne DEINE Erlaubnis.",
    },
  },
  {
    id: "business",
    icon: "🏢",
    label: "Betriebe",
    headline: "Für größere Strukturen",
    subline: "Stallbetreiber, Ausbildungsbetriebe und Pferdepensionen",
    features: [
      "Mehrere Hufpfleger verwalten",
      "Stallgemeinschaft digital organisieren",
      "Alle Pferde im Überblick",
      "Team-Kommunikation",
      "DSGVO-konforme Datenverwaltung",
      "Skalierbar — von 1 bis 1000+ Pferden",
    ],
    price: "Team-Plan ab 79€/Monat",
    ctaLabel: "Demo anfragen →",
    ctaLink: "#contact",
  },
];

export default function AudienceTabsSection() {
  const [activeTab, setActiveTab] = useState("provider");
  const activeData = TABS.find((t) => t.id === activeTab)!;

  return (
    <section className="py-20 md:py-28 bg-zinc-950" id="audience">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Für wen ist Hufi?
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Jede Rolle hat ihre eigene App — perfekt auf die Bedürfnisse zugeschnitten.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mb-10">
          <div className="flex overflow-x-auto gap-1 bg-zinc-900 rounded-xl p-1.5 max-w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left: Features */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{activeData.headline}</h3>
                  <p className="text-zinc-400 mt-2">{activeData.subline}</p>
                </div>

                <ul className="space-y-3">
                  {activeData.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300">
                      <span className="text-orange-400 mt-0.5 flex-shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {activeData.highlight && (
                  <div className="border border-orange-500/30 bg-orange-500/10 rounded-lg p-4 space-y-1">
                    <p className="font-semibold text-orange-400 text-sm">
                      {activeData.highlight.icon} {activeData.highlight.title}
                    </p>
                    <p className="text-sm text-zinc-300">{activeData.highlight.text}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <span className="text-zinc-400 text-sm font-medium">{activeData.price}</span>
                  <a
                    href={activeData.ctaLink}
                    className="inline-flex items-center px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    {activeData.ctaLabel}
                  </a>
                </div>
              </div>

              {/* Right: Placeholder */}
              <div className="hidden md:flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl aspect-[4/3]">
                <div className="text-center space-y-2 text-zinc-600">
                  <span className="text-4xl">{activeData.icon}</span>
                  <p className="text-xs">Screenshot: {activeData.label} App</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
