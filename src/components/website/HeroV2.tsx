import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroHorse from "@/assets/lp/hero-horse.png";

const trustItems = ["DSGVO", "DE-Server", "Offlinefähig", "Mobile-first"];

const highlights = [
  "für das Pferdewohl.",
  "Für deine Kunden.",
  "Für dein Team.",
  "Für deine Familie.",
  "Für dich.",
];

const HeroV2 = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 animate-fade-up">
              <span className="text-xs font-semibold text-primary">Für Hufbearbeiter · Therapeuten · Trainer · und mehr</span>
            </div>
            <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight animate-fade-up" style={{ animationDelay: "0ms" }}>
              Die Plattform, die Pferde-Profis <span className="text-primary">den Rücken freihält.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 font-medium leading-snug animate-fade-up" style={{ animationDelay: "100ms" }}>
              Mehr Zeit für das, was dir wirklich wichtig ist:
            </p>
            <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: "150ms" }}>
              {highlights.map((item) => (
                <span key={item} className="text-lg text-white/60 italic">{item}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
                <a href="#demo"><Play className="mr-2 h-5 w-5" />Demo ansehen</a>
              </Button>
              <Button variant="outline" size="lg" className="text-lg font-semibold border-white/20 text-white hover:bg-white/10" asChild>
                <a href="#pricing">Preise ansehen<ArrowRight className="ml-2 h-5 w-5" /></a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
              {trustItems.map((item) => (
                <span key={item} className="text-xs font-medium text-white/50 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">{item}</span>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up lg:pl-8" style={{ animationDelay: "300ms" }}>
            <div className="relative mx-auto max-w-[420px] lg:max-w-[500px]">
              <div className="absolute inset-0 bg-primary/20 blur-[80px] scale-75" />
              <img src={heroHorse} alt="HufManager – Die Plattform für Pferde-Profis" className="relative w-full h-auto drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroV2;
