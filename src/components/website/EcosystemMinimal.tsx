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

export default function EcosystemHeader() {
  const r = useReveal();

  return (
    <div className="pt-20 md:pt-28 pb-0" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="container">
        <div
          ref={r.ref}
          className={`text-center transition-all duration-[600ms] ease-out ${r.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 text-white">
            Ein System. Alle Beteiligten.
            <br className="hidden sm:block" />
            <span style={{ color: "#f97316" }}>Ein Pferd im Mittelpunkt.</span>
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Hufbearbeiter, Tierarzt, Physiotherapeut, Besitzer — jeder hat seinen Ausschnitt.
            <br className="hidden md:block" />
            Hufi verbindet sie alle.
          </p>
        </div>
      </div>
    </div>
  );
}
