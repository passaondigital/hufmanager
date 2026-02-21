import { Button } from "@/components/ui/button";
import { Play, Hammer, Heart, Stethoscope, Users, Zap } from "lucide-react";

const DemoSection = () => (
  <section id="demo" className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Erleben statt lesen</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">1 Klick. 4 Perspektiven.</h2>
        <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto">
          Wenn du jetzt mehr wissen willst, schau dich mit den 1-Click-Optionen um. Kein Registrieren, kein Warten – sofort drin.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Hammer className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Hufbearbeiter-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Dein Cockpit: Termine, Rechnungen, Kunden, Routen – alles im Blick.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Heart className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Kunden-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Die Sicht deiner Pferdebesitzer: Pferdeakte, Termine & Rechnungen.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Stethoscope className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Partner-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Für Tierärzte, Therapeuten & Co – weil das Pferd im Zentrum steht und du nicht alleine bist.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Users className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Mitarbeiter-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Touren, Aufträge & Dokumentation – für dein Team unterwegs.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-zinc-900/80 p-6 mb-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-white">Noch mehr Kopf & Rücken frei?</h3>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            Probier einen der <span className="text-primary font-bold">3 AutoFlow-Modi</span> aus – und erlebe, wie sich Verwaltung von selbst erledigt.
          </p>
        </div>

        <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
          <a href="https://app.hufmanager.de/auth" target="_blank" rel="noopener noreferrer"><Play className="mr-2 h-5 w-5" />Jetzt Demo starten</a>
        </Button>
        <p className="text-white/40 text-sm mt-6">Kein Verkaufsgespräch. Kein Druck. Einfach reinschauen und selbst entscheiden.</p>
      </div>
    </div>
  </section>
);

export default DemoSection;
