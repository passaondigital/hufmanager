import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal, revealClass } from "./useReveal";

const ctaBadges = ["🔒 DSGVO", "🇩🇪 EU-Server", "📱 Kein App Store", "§ 19 UStG"];

const FinalCtaSection = () => {
  const r = useReveal();
  return (
    <section className="relative hufi-section overflow-hidden" style={{ backgroundColor: "#f97316" }}>
      <div className="hufi-container-standard relative z-10">
        <div ref={r.ref} className={`max-w-2xl mx-auto text-center space-y-7 ${revealClass(r.visible)}`}>
          <h2 className="hufi-h2 text-white">Weniger Verwaltung.<br />Mehr Zeit am Pferd.</h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Hufbearbeiter, Reitlehrer, Stallbetreiber — starte heute kostenlos.<br />
            14 Tage. Kein Risiko. Kein Vertrag.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="text-base sm:text-lg font-bold bg-white hover:bg-white/90 gap-2 w-full sm:w-auto" style={{ color: "#f97316" }} asChild>
              <a href="/auth">Kostenlos starten <ArrowRight className="h-5 w-5" /></a>
            </Button>
            <Button size="lg" variant="ghost" className="text-base sm:text-lg text-white hover:bg-white/10 border border-white/30 gap-2 w-full sm:w-auto" asChild>
              <a href="/auth?force=login">Einloggen</a>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {ctaBadges.map((b) => (
              <span key={b} className="text-white/70 text-xs font-medium">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
