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

const pains = [
  {
    icon: "🗺️",
    title: "Jeder Tag neu planen.",
    text: "Welche Reihenfolge? Welche Route? Wer ist wo? Das kostet Kopf bevor du überhaupt im Sattel bist.",
  },
  {
    icon: "📋",
    title: "Befunde auf Zetteln. Fotos im Handy. Notizen irgendwo.",
    text: "Wenn du in drei Monaten weißt was du heute gemacht hast — aber nicht mehr wo — stimmt etwas nicht.",
  },
  {
    icon: "💸",
    title: "Rechnungen die du vergisst sind Geld das du schenkst.",
    text: "Nicht aus Großzügigkeit. Aus Zeitmangel.",
  },
];

export default function PainCardsSection() {
  const r0 = useReveal();
  const r1 = useReveal();
  const r2 = useReveal();
  const reveals = [r0, r1, r2];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {pains.map((pain, i) => (
            <div
              key={i}
              ref={reveals[i].ref}
              className={rc(reveals[i].visible)}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col" style={{ backgroundColor: "#f9fafb" }}>
                <span className="text-3xl mb-4 block">{pain.icon}</span>
                <h3 className="text-lg font-bold mb-3 leading-snug" style={{ color: "#0a0a0a" }}>
                  {pain.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#6b7280" }}>
                  {pain.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
