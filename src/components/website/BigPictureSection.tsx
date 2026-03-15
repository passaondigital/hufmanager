import { useEffect, useRef, useState } from "react";

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const rc = (v: boolean, extra = "") =>
  `transition-all duration-[600ms] ease-out ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${extra}`;

const points = [
  {
    icon: "🤝",
    title: "Zusammenarbeit zum Pferdewohl",
    text: "Hufbearbeiter, Tierarzt, Physiotherapeut, Besitzer — jeder arbeitet am selben Pferd. Aber jeder hat nur seinen Ausschnitt. HufManager verbindet diese Ausschnitte zu einem vollständigen Bild.",
  },
  {
    icon: "🛡️",
    title: "Sicherheit für alle Beteiligten",
    text: "Wenn etwas passiert zählen Fakten — keine Erinnerungen, keine Meinungen. Lückenlose Dokumentation schützt den Profi, den Besitzer und vor allem das Pferd.",
  },
  {
    icon: "🐴",
    title: "Das Pferd im Mittelpunkt",
    text: "Nicht die Software. Nicht die Abrechnung. Das Pferd. Jede Entscheidung die HufManager unterstützt, dient einem Ziel: dass jedes Pferd die Betreuung bekommt die es als Individuum braucht.",
  },
];

export default function BigPictureSection() {
  const rIntro = useReveal();
  const rP0 = useReveal();
  const rP1 = useReveal();
  const rP2 = useReveal();
  const rClosing = useReveal();
  const pointReveals = [rP0, rP1, rP2];

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Intro */}
        <div ref={rIntro.ref} className={`text-center mb-16 ${rc(rIntro.visible)}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white mb-4">
            HufManager ist mehr als{" "}
            <br className="hidden sm:block" />
            Buchhaltung und Terminplanung.
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
            Es geht um das was jeder kennt der täglich mit Pferden arbeitet oder lebt.
          </p>
        </div>

        {/* Three points */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {points.map((point, i) => (
            <div
              key={i}
              ref={pointReveals[i].ref}
              className={rc(pointReveals[i].visible)}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <span className="text-4xl mb-4 block">{point.icon}</span>
                <h3
                  className="text-lg font-bold mb-3 leading-snug"
                  style={{ color: "#f97316" }}
                >
                  {point.title}
                </h3>
                <p
                  className="text-sm md:text-base leading-relaxed"
                  style={{ color: "rgba(255,255,255,.7)" }}
                >
                  {point.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <div ref={rClosing.ref} className={`text-center ${rc(rClosing.visible)}`}>
          <p
            className="text-xl md:text-2xl lg:text-3xl font-extrabold leading-snug max-w-3xl mx-auto"
            style={{ color: "#f97316" }}
          >
            Vom der Geburt eines Fohlens bis zur Regenbogenbrücke — ein System das mitgeht.
          </p>
        </div>
      </div>
    </section>
  );
}
