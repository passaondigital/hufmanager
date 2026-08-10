import { useReveal, revealClass } from "./useReveal";

const steps = [
  { icon: "👂", label: "Verstehen", desc: "Hufi nimmt auf, was du sagst oder einträgst — im Kontext deines Betriebs." },
  { icon: "💡", label: "Vorschlagen", desc: "Hufi bereitet einen Vorschlag vor: Rechnung, Termin, Befund-Entwurf." },
  { icon: "✅", label: "Bestätigen", desc: "Nichts passiert automatisch. Du prüfst und gibst frei." },
  { icon: "⚡", label: "Ausführen", desc: "Erst nach deiner Bestätigung wird gespeichert, gesendet, gebucht." },
  { icon: "🧠", label: "Lernen", desc: "Hufi merkt sich den Kontext für das nächste Mal." },
];

const HowItWorksSection = () => {
  const r = useReveal();
  return (
    <section className="hufi-section-tight hufi-bg-dark">
      <div className="hufi-container-standard">
        <div className="text-center mb-14">
          <span className="hufi-eyebrow">So arbeitet Hufi</span>
          <h2 className="hufi-h2 text-white mt-4">Kein Blackbox-Automatismus.</h2>
        </div>

        <div ref={r.ref} className={`relative grid sm:grid-cols-5 gap-6 ${revealClass(r.visible)}`}>
          <div className="hidden sm:block absolute top-8 left-[10%] right-[10%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)" }} />
          {steps.map((s, i) => (
            <div key={s.label} className="relative text-center flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 relative z-10"
                style={{ background: "#0a0a0a", border: "1.5px solid rgba(249,115,22,0.35)" }}
              >
                {s.icon}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#f97316" }}>
                {i + 1} · {s.label}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-12">
          „Bestätigen" ist kein Detail — es ist das Prinzip: Hufi schlägt vor, du entscheidest.
        </p>
      </div>
    </section>
  );
};

export default HowItWorksSection;
