import { X, Check } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

const pairs = [
  {
    pain: "Jeden Tag neu überlegen: welche Reihenfolge, welche Route, wer ist wo.",
    solution: "Tourenplanung mit optimierter Reihenfolge und Navigation — bevor du das erste Pferd siehst.",
  },
  {
    pain: "Rechnungen, die du vergisst. Nicht aus Großzügigkeit — aus Zeitmangel.",
    solution: "Rechnung in Sekunden erstellt und per PDF oder E-Mail raus, direkt nach dem Termin.",
  },
  {
    pain: "Befunde auf Zetteln, Fotos im Handy, Notizen verstreut in WhatsApp.",
    solution: "Digitale Pferdeakte: Fotos, Befunde, Verlauf — an einem Ort, für dich und dein Team.",
  },
  {
    pain: "Kundschaft fragt ständig: Wann kommst du? Was hat das Pferd? Rechnung nochmal?",
    solution: "Kunden-App zeigt Termine, Befunde und Rechnungen selbst — kostenlos für deine Kundschaft.",
  },
];

const ProblemSection = () => {
  const rHead = useReveal();
  const rRows = useReveal();
  return (
    <section id="problem" className="hufi-section hufi-bg-darker">
      <div className="hufi-container-standard">
        <div ref={rHead.ref} className={`text-center mb-16 ${revealClass(rHead.visible)}`}>
          <span className="hufi-eyebrow">Der Alltag danach</span>
          <h2 className="hufi-h2 text-white mt-4">
            Nach dem letzten Pferd<br />
            fängt die Arbeit erst an.
          </h2>
        </div>

        <div ref={rRows.ref} className={`space-y-5 max-w-4xl mx-auto ${revealClass(rRows.visible)}`}>
          {pairs.map((pair, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/5 border border-red-500/15">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center mt-0.5">
                  <X className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <span className="text-red-400/70 text-xs font-bold uppercase tracking-wider">Ohne Hufi</span>
                  <p className="text-white/65 text-sm mt-1 leading-relaxed">{pair.pain}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#F97316]/5 border border-[#F97316]/20">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F97316]/15 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-[#F97316]" />
                </div>
                <div>
                  <span className="text-[#F97316]/80 text-xs font-bold uppercase tracking-wider">Mit Hufi</span>
                  <p className="text-white/80 text-sm mt-1 leading-relaxed">{pair.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-white/30 text-sm mt-10">Das sind keine Ausnahmen. Das ist Pferdealltag.</p>
      </div>
    </section>
  );
};

export default ProblemSection;
