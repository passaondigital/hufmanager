import { Check } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import appDashboard from "@/assets/lp/app-dashboard.png";
import customerHome from "@/assets/lp/customer-app-home.png";

const todayFeatures = [
  { icon: "🎙️", title: "„Hey Hufi\" Sprachsteuerung", desc: "Hände­frei im Stall: Kalender öffnen, Rechnung vorbereiten, Status abfragen — per Zuruf." },
  { icon: "🌅", title: "Proaktives Tages-Briefing", desc: "Hufi begrüßt dich morgens mit Terminen, überfälligen Pferden und dem Wetter." },
  { icon: "🐴", title: "Vollständige Pferdeakte", desc: "Befunde, Fotos, Verlauf pro Pferd — dokumentiert und wiederfindbar." },
  { icon: "🗺️", title: "Tourenplanung", desc: "Termine, Reihenfolge und Navigation für den ganzen Tag auf einen Blick." },
  { icon: "🧾", title: "Rechnungen in Sekunden", desc: "PDF, E-Mail, fertig — direkt nach dem Termin, du bestätigst, Hufi erledigt den Rest." },
  { icon: "📴", title: "Offline im Stall", desc: "Grundfunktionen laufen auch ohne Empfang, Synchronisation folgt automatisch." },
  { icon: "🚨", title: "Notfallzugang per QR-Code", desc: "Wichtige Pferdedaten für Dritte im Ernstfall abrufbar — ganz ohne Login." },
  { icon: "👥", title: "Kunden- & Materialverwaltung", desc: "Kontakte, Lager und Verbrauch im Griff, ohne separate Tools." },
];

const TodaySection = () => {
  const rHead = useReveal();
  const rGrid = useReveal();
  const rProof = useReveal();
  return (
    <section id="heute" className="hufi-section hufi-bg-white">
      <div className="hufi-container-wide">
        <div ref={rHead.ref} className={`text-center mb-14 ${revealClass(rHead.visible)}`}>
          <span className="hufi-eyebrow">Was Hufi heute schon kann</span>
          <h2 className="hufi-h2 text-gray-900 mt-4 mb-4">Kein Versprechen. Im Einsatz.</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Diese Funktionen sind heute nutzbar — nicht in Planung, nicht in Aussicht.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <div ref={rGrid.ref} className={`grid sm:grid-cols-2 gap-4 ${revealClass(rGrid.visible)}`}>
            {todayFeatures.map((f) => (
              <div key={f.title} className="hufi-card-feature-light">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div ref={rProof.ref} className={`flex flex-col gap-5 ${revealClass(rProof.visible)}`}>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100">
              <img src={appDashboard} alt="Echtes Dashboard eines Hufbearbeiter-Betriebs in Hufi" className="w-full h-auto block" />
            </div>
            <div className="flex items-center gap-3 max-w-sm mx-auto lg:mx-0">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 w-32 flex-shrink-0">
                <img src={customerHome} alt="Echte Ansicht der kostenlosen Kunden-App" className="w-full h-auto block" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Echte Screenshots, keine Illustrationen — links das Betriebs-Cockpit,
                rechts die kostenlose App für Pferdebesitzer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-12">
          <span className="hufi-badge-live" style={{ color: "#059669", background: "rgba(5,150,105,0.08)", borderColor: "rgba(5,150,105,0.25)" }}>
            <Check className="w-3 h-3" /> Live &amp; im täglichen Einsatz
          </span>
        </div>
      </div>
    </section>
  );
};

export default TodaySection;
