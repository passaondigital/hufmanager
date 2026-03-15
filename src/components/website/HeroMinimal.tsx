import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const badges = ["Keine Kreditkarte", "Kündigung jederzeit", "DSGVO-konform", "Offline-fähig"];

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

const HeroMinimal = () => {
  const r = useReveal();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px]" style={{ backgroundColor: "rgba(249,115,22,0.08)" }} />

      <div className="container relative z-10 py-20 md:py-32">
        <div ref={r.ref} className={`max-w-3xl mx-auto text-center space-y-8 transition-all duration-[800ms] ease-out ${r.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight">
            Nach dem letzten Pferd{" "}
            <br className="hidden sm:block" />
            fängt die Arbeit an.
            <br />
            <span style={{ color: "#f97316" }}>Mit HufManager nicht mehr.</span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
            Termine. Routen. Rechnungen. Pferdeakte.
            <br />
            Alles in einer App — für alle die am Pferd arbeiten.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button size="lg" className="glow-orange text-lg font-bold bg-[#F5970A] hover:bg-[#E08A09] text-white gap-2" asChild>
              <a href="#demo">
                🐴 14 Tage kostenlos testen
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="ghost" className="text-lg text-white/80 hover:text-white border border-white/15 hover:border-white/30 gap-2" asChild>
              <a href="#demo">
                Demo ansehen
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {badges.map((b) => (
              <span key={b} className="text-xs font-medium px-3 py-1.5 rounded-full border" style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroMinimal;
