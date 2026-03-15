import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FinalCTA = () => (
  <section className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: "#f97316" }}>
    <div className="container relative z-10">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Bereit für einen klareren Kopf?
        </h2>
        <p className="text-lg text-white/80 max-w-xl mx-auto">
          14 Tage kostenlos. Keine Kreditkarte.
          <br />
          Kündigung jederzeit.
        </p>
        <Button size="lg" className="text-lg font-bold bg-white hover:bg-white/90 gap-2" style={{ color: "#f97316" }} asChild>
          <a href="#demo">
            Jetzt kostenlos starten
            <ArrowRight className="h-5 w-5" />
          </a>
        </Button>
      </div>
    </div>
  </section>
);

export default FinalCTA;
