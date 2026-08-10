import { ArrowRight } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

const secondaryRoles = [
  {
    icon: "🩺",
    title: "Tierärzte & Therapeuten",
    desc: "Befunde einsehen, eigene Diagnosen ergänzen — mit Freigabe des Besitzers.",
  },
  {
    icon: "🐎",
    title: "Reitlehrer & Trainer",
    desc: "Stundenpläne, Fortschritt je Pferd, Rechnungen — alle Schüler auf einen Blick.",
  },
  {
    icon: "🏠",
    title: "Stallbetreiber",
    desc: "Alle Pferde, alle Dienstleister, ein Dashboard. Nichts geht im Stallalltag unter.",
  },
];

const RolesSection = () => {
  const rHead = useReveal();
  const rPrimary = useReveal();
  const rSecondary = useReveal();
  return (
    <section id="fuer-wen" className="hufi-section hufi-bg-white">
      <div className="hufi-container-wide">
        <div ref={rHead.ref} className={`text-center mb-14 ${revealClass(rHead.visible)}`}>
          <span className="hufi-eyebrow">Für wen ist Hufi?</span>
          <h2 className="hufi-h2 text-gray-900 mt-4 mb-4">Gebaut für Hufbearbeiter.<br className="hidden sm:block" /> Offen für deine ganze Pferdewelt.</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Das Pferd im Mittelpunkt. Jeder sieht genau das, was er sehen darf.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mb-6">
          {/* Primary role — Hufbearbeiter */}
          <div
            ref={rPrimary.ref}
            className={`rounded-3xl p-8 md:p-10 flex flex-col justify-between ${revealClass(rPrimary.visible)}`}
            style={{ background: "linear-gradient(150deg, rgba(249,115,22,0.08), rgba(249,115,22,0.015))", border: "1px solid rgba(249,115,22,0.25)" }}
          >
            <div>
              <span className="text-4xl mb-4 block">🔧</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Hufbearbeiter & Hufschmiede</h3>
              <p className="text-gray-600 text-base leading-relaxed max-w-md">
                Für dich ist Hufi gebaut: Termine, Touren, Befunde, Rechnungen — Hufi dokumentiert
                per Sprache mit. Kein Tippen im Stall.
              </p>
            </div>
            <a href="/auth" className="inline-flex items-center gap-2 mt-8 font-bold text-sm w-fit px-6 py-3 rounded-full text-white" style={{ background: "#F97316" }}>
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Pferdebesitzer */}
          <div className="rounded-3xl p-8 md:p-10 flex flex-col justify-between bg-gray-50 border border-gray-100">
            <div>
              <span className="text-4xl mb-4 block">🐴</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Pferdebesitzer</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Digitale Pferdeakte, Befunde vom Profi, Dienstleister finden — komplett kostenlos.
                Zugriffe auf dein Pferd sind an deine Freigabe gebunden.
              </p>
            </div>
            <a href="/auth" className="hufi-link-arrow mt-8">
              Jetzt kostenlos registrieren <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div ref={rSecondary.ref} className={`grid sm:grid-cols-3 gap-4 ${revealClass(rSecondary.visible)}`}>
          {secondaryRoles.map((role) => (
            <div key={role.title} className="hufi-card-feature-light">
              <div className="text-2xl mb-3">{role.icon}</div>
              <h4 className="font-bold text-gray-900 text-sm mb-2">{role.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed mb-3">{role.desc}</p>
              <a href="/auth" className="hufi-link-arrow">Kostenlos starten <ArrowRight className="h-3 w-3" /></a>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-xs mt-10">
          Pferdebesitzer nutzen Hufi immer kostenlos · Profis 14 Tage kostenlos testen
        </p>
      </div>
    </section>
  );
};

export default RolesSection;
