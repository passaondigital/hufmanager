import { useReveal, revealClass } from "./useReveal";

const learningFeatures = [
  {
    icon: "🎯",
    title: "AutoFlow — Sprache wird Befund",
    desc: "Du sprichst deine Beobachtung, Hufi bereitet daraus einen Befund-Entwurf vor. Aktuell im internen Test, noch ohne dauerhafte Speicherung.",
  },
  {
    icon: "⚡",
    title: "Frühwarnung aus dem Kontext",
    desc: "Hufi soll perspektivisch auffällige Muster (überfällige Pferde, ungewöhnlicher Verlauf) selbst anstoßen. Heute reine Konzeptarbeit.",
  },
  {
    icon: "📸",
    title: "Foto-Analyse für den Huf",
    desc: "Die Vision: Foto rein, erste Einschätzung raus. Heute gibt es dafür ein manuelles Mess- und Dokumentationsformular (LTZ) — die KI-Auswertung ist noch nicht gebaut.",
  },
  {
    icon: "🕸️",
    title: "Vollständige Vernetzung",
    desc: "Das Zugriffs-Fundament zwischen Hufbearbeiter, Besitzer und weiteren Rollen steht. Tierärzte und Therapeuten als eigene, vollwertige Rolle folgen.",
  },
];

const LearningSection = () => {
  const rHead = useReveal();
  const rGrid = useReveal();
  return (
    <section className="hufi-section hufi-bg-cream">
      <div className="hufi-container-wide">
        <div ref={rHead.ref} className={`text-center mb-14 ${revealClass(rHead.visible)}`}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ color: "#1d4ed8", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
            In Entwicklung
          </span>
          <h2 className="hufi-h2 mt-2 mb-4" style={{ color: "#1A1510" }}>Was Hufi gerade lernt.</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#70685C" }}>
            Ehrlich gesagt: nicht fertig. Hier bauen wir gerade — bewusst offen gezeigt,
            statt als „live" verkauft.
          </p>
        </div>

        <div ref={rGrid.ref} className={`grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto ${revealClass(rGrid.visible)}`}>
          {learningFeatures.map((f) => (
            <div key={f.title} className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-2xl">{f.icon}</span>
                <span className="hufi-badge-preview" style={{ color: "#1d4ed8", background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)" }}>Preview</span>
              </div>
              <h3 className="font-bold text-base mb-1.5" style={{ color: "#1A1510" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#70685C" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearningSection;
