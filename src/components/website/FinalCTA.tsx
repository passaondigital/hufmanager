import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => (
  <section className="relative py-24 md:py-32 bg-black overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/15 rounded-full blur-[150px]" />
    </div>
    <div className="container relative z-10">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Bereit für einen <span className="text-primary">klareren Kopf?</span>
        </h2>
        <p className="text-lg text-white/60 max-w-xl mx-auto">
          Jetzt kostenlos testen – keine Kreditkarte, kein Risiko.
        </p>
        <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
          <Link to="/auth">Kostenlos starten<ArrowRight className="ml-2 h-5 w-5" /></Link>
        </Button>
        <div className="pt-4 space-y-2">
          <p className="text-white/40 text-sm">HufManager – weil die Pferdebranche eine bessere Zukunft verdient.</p>
          <p className="text-primary font-bold text-sm">#ZukunftHuf2030</p>
        </div>
        <p className="text-sm text-white/30 pt-2">DSGVO-konform · Deutsche Server · Monatlich kündbar</p>
      </div>
    </div>
  </section>
);

export default FinalCTA;
