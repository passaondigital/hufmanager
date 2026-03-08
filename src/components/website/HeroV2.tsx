import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroHorse from "@/assets/lp/hero-horse.png";

const trustItems = ["DSGVO-konform", "EU-Server", "Offlinefähig", "Mobile-first"];

const HeroV2 = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#F5970A]/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#F5970A]/8 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#F5970A]/30 bg-[#F5970A]/10 animate-fade-up">
              <span className="text-xs font-semibold text-[#F5970A]">Vom Stall für den Stall</span>
            </div>

            <h1 className="font-sans text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.08] tracking-tight animate-fade-up" style={{ animationDelay: "0ms" }}>
              Schluss mit Zetteln und{" "}
              <span className="text-[#F5970A]">WhatsApp-Chaos.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 font-medium leading-snug animate-fade-up" style={{ animationDelay: "100ms" }}>
              Termine, Pferde, Rechnungen, Navigation – alles in einer App.
              <br className="hidden md:block" />
              <span className="text-white/60">Von einem Hufpfleger. Für alle die am Pferd arbeiten.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <Button size="lg" className="glow-orange text-lg font-bold bg-[#F5970A] hover:bg-[#E08A09] text-white gap-2" asChild>
                <a href="#demo">
                  🐴 14 Tage kostenlos testen
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            </div>

            {/* Trust line under CTA */}
            <p className="text-white/40 text-sm animate-fade-up" style={{ animationDelay: "250ms" }}>
              Keine Kreditkarte · Kündigung jederzeit
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="h-4 w-4 text-[#F5970A] fill-[#F5970A]" />
                ))}
              </div>
              <span className="text-white/60 text-sm">
                Wird von Hufpflegern, Therapeuten und Reitern genutzt
              </span>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-2 animate-fade-up" style={{ animationDelay: "350ms" }}>
              {trustItems.map((item) => (
                <span key={item} className="text-xs font-medium text-white/50 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">{item}</span>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up lg:pl-8" style={{ animationDelay: "300ms" }}>
            <div className="relative mx-auto max-w-[420px] lg:max-w-[500px]">
              <div className="absolute inset-0 bg-[#F5970A]/20 blur-[80px] scale-75" />
              <img src={heroHorse} alt="HufManager – Schluss mit Zetteln und WhatsApp-Chaos" className="relative w-full h-auto drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroV2;
