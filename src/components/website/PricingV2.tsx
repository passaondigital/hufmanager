import { Button } from "@/components/ui/button";
import { Check, Play } from "lucide-react";

const included = [
  "Provider-App (dein Cockpit)",
  "Kunden-App (kostenlos für Besitzer)",
  "Offline-Modus",
  "Unbegrenzte Rechnungen (GoBD)",
  "Huf-Dokumentation & Fotos",
  "DSGVO-konform · Deutsche Server",
];

const PricingV2 = () => (
  <section id="pricing" className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Preise</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">Einfach. Transparent.</h2>
          <p className="text-white/60 text-lg">Kein Feature-Dschungel. Ein Preis, alles drin.</p>
        </div>
        <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 to-transparent p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-8">
            <div>
              <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-2">HufManager</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-extrabold text-white">ab 19€</span>
                <span className="text-white/50 text-lg">/ Monat</span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-primary font-semibold text-sm">14 Tage kostenlos testen</p>
              <p className="text-white/40 text-sm">Nach persönlicher Demo</p>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 mb-8">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-black" /></div>
                <span className="text-white/80 text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-4 items-center">
            <Button size="lg" className="glow-orange text-lg font-bold w-full sm:w-auto bg-primary hover:bg-primary/90 text-white" asChild>
              <a href="#demo"><Play className="mr-2 h-5 w-5" />Demo ansehen</a>
            </Button>
            <p className="text-white/40 text-sm">Monatlich kündbar · Keine Kreditkarte nötig</p>
          </div>
        </div>
        <p className="text-center text-white/40 text-sm mt-8">Bereits eine Hufbearbeitung finanziert deinen gesamten Monat. Der Rest ist Gewinn.</p>
      </div>
    </div>
  </section>
);

export default PricingV2;
