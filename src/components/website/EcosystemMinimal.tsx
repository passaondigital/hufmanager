import { useEffect, useRef, useState } from "react";
import HorseEcosystem from "@/components/website/HorseEcosystem";

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

export default function EcosystemMinimal() {
  const r = useReveal();

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div className="container">
        <div
          ref={r.ref}
          className={`text-center mb-12 transition-all duration-[600ms] ease-out ${r.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4" style={{ color: "#0a0a0a" }}>
            Ein System. Alle Beteiligten.
            <br className="hidden sm:block" />
            <span style={{ color: "#f97316" }}>Ein Pferd im Mittelpunkt.</span>
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
            Hufbearbeiter, Tierarzt, Physiotherapeut, Besitzer — jeder hat seinen Ausschnitt.
            <br className="hidden md:block" />
            HufManager verbindet sie alle.
          </p>
        </div>
      </div>
      {/* Reuse the existing HorseEcosystem diagram — it renders its own container */}
      <HorseEcosystem />
    </section>
  );
}
