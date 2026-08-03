import { Shield, Server, FileCheck, Info } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

const dataPoints = [
  "Zugriff auf ein Pferd braucht die Freigabe des Besitzers — niemand sieht mit ohne diese Freigabe.",
  "Deine Daten bleiben auf Servern in der EU.",
  "Deine Daten werden nicht zum Training fremder KI-Modelle verwendet.",
  "Bei jeder KI-gestützten Funktion siehst du, dass und wie eine KI beteiligt ist.",
];

const TrustDataSection = () => {
  const r = useReveal();
  return (
    <section className="hufi-section hufi-bg-cream">
      <div className="hufi-container-narrow">
        <div ref={r.ref} className={`space-y-9 ${revealClass(r.visible)}`}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-5" style={{ backgroundColor: "#F97316" }}>
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="hufi-h2 mb-3" style={{ color: "#1A1510" }}>Vertrauen & Datenhoheit</h2>
            <p className="text-base" style={{ color: "#70685C" }}>
              Der Pferdebesitzer entscheidet, wer sein Pferd sieht — nicht Hufi, nicht der Betrieb.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {dataPoints.map((pt) => (
              <div key={pt} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-black/5">
                <FileCheck className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#059669" }} />
                <p className="text-sm leading-relaxed" style={{ color: "#453215" }}>{pt}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-black/5">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#70685C" }} />
            <p className="text-sm leading-relaxed" style={{ color: "#70685C" }}>
              Eine übersichtliche Zugriffs­verwaltung pro Pferd (wer hat wann Zugriff bekommen,
              Zugriff mit einem Klick entziehen) bauen wir gerade aus — heute ist die Freigabe
              an die Einladung gebunden, ein zentrales Verwaltungs­panel folgt.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-black/5" style={{ color: "#453215" }}>
              <Server className="h-3.5 w-3.5" style={{ color: "#F97316" }} /> EU-Server
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-black/5" style={{ color: "#453215" }}>
              <Shield className="h-3.5 w-3.5" style={{ color: "#F97316" }} /> DSGVO-konform
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-black/5" style={{ color: "#453215" }}>
              <Info className="h-3.5 w-3.5" style={{ color: "#F97316" }} /> KI-Transparenzhinweis nach EU AI Act
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustDataSection;
