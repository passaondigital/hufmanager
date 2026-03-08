import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => (
  <section className="relative py-24 md:py-32 bg-black overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#F5970A]/15 rounded-full blur-[150px]" />
    </div>
    <div className="container relative z-10">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Bereit für einen <span className="text-[#F5970A]">klareren Kopf?</span>
        </h2>
        <p className="text-lg text-white/60 max-w-xl mx-auto">
          14 Tage kostenlos testen – keine Kreditkarte, kein Risiko.
          <br />
          Für Hufbearbeiter, Therapeuten, Trainer und alle Pferde-Profis.
        </p>
        <Button size="lg" className="glow-orange text-lg font-bold bg-[#F5970A] hover:bg-[#E08A09] text-white gap-2" asChild>
          <a href="#demo">
            🐴 Kostenlos starten
            <ArrowRight className="h-5 w-5" />
          </a>
        </Button>
        <p className="text-white/40 text-sm">Keine Kreditkarte · Kündigung jederzeit · Monatlich kündbar</p>
        <p className="text-[#F5970A] font-bold text-sm">#ZukunftHuf2030</p>
        <p className="text-sm text-white/30">DSGVO-konform · Deutsche Server · Vom Stall für den Stall</p>
      </div>
    </div>
  </section>
);

export default FinalCTA;
