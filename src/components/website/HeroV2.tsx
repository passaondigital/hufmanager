import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import customerAppScreenshot from "@/assets/lp/customer-app-screenshot.jpeg";

const trustItems = ["DSGVO", "DE-Server", "Offlinefähig", "Mobile-first"];

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
            <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight animate-fade-up" style={{ animationDelay: "0ms" }}>
              Betriebssystem für <span className="text-primary">Hufbearbeiter.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 font-medium leading-snug animate-fade-up" style={{ animationDelay: "100ms" }}>
              Ein System für Betrieb, Team & Kunden – online & offline.
            </p>
            <p className="text-lg text-white/50 max-w-lg animate-fade-up" style={{ animationDelay: "150ms" }}>
              Schluss mit Zettelchaos, No-Shows und Diskussionen.
            </p>
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
            <div className="relative mx-auto max-w-[300px] lg:max-w-[360px]">
              <div className="absolute inset-0 bg-primary/25 blur-[60px] scale-90" />
              <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[3rem] p-3 shadow-2xl border border-white/10">
                <div className="bg-black rounded-[2.5rem] overflow-hidden">
                  <div className="bg-black h-8 flex justify-center pt-2 relative z-10">
                    <div className="w-24 h-4 bg-zinc-900 rounded-full" />
                  </div>
                  <img src={customerAppScreenshot} alt="HufManager App" className="w-full -mt-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroV2;
