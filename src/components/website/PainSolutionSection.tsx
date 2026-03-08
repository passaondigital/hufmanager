import { X, Check } from "lucide-react";

const pairs = [
  {
    pain: "Routen-Chaos: Jeden Tag aufs Neue überlegen, welche Reihenfolge Sinn macht.",
    solution: "Tour-Cockpit: Optimierte Reihenfolge, Turn-by-Turn Navigation, Live-Spritpreise.",
  },
  {
    pain: "Rechnungen vergessen: Am Monatsende suchen, wer noch nicht bezahlt hat.",
    solution: "2-Klick PDF: Rechnung direkt nach dem Termin – DATEV-ready.",
  },
  {
    pain: "Befunde auf Zetteln: Fotos in der Galerie, Notizen in WhatsApp, Berichte nirgends.",
    solution: "Digitale Pferdeakte: Fotos, Befunde, Huf-Verlauf – alles an einem Ort.",
  },
  {
    pain: "Kunden fragen ständig: Wann kommst du? Was hat das Pferd? Schick nochmal die Rechnung!",
    solution: "Kunden-App: Dein Kunde sieht Termine, Befunde und Rechnungen selbst – kostenlos.",
  },
];

const PainSolutionSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#F5970A] font-bold text-sm uppercase tracking-widest">Vorher → Nachher</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Dein Alltag – mit und ohne HufManager
          </h2>
        </div>

        <div className="space-y-6">
          {pairs.map((pair, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-4">
              {/* Pain */}
              <div className="flex items-start gap-4 p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <span className="text-red-400/80 text-xs font-bold uppercase tracking-wider">Vorher</span>
                  <p className="text-white/70 text-sm mt-1 leading-relaxed">{pair.pain}</p>
                </div>
              </div>

              {/* Solution */}
              <div className="flex items-start gap-4 p-5 rounded-xl bg-[#F5970A]/5 border border-[#F5970A]/20">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5970A]/20 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-[#F5970A]" />
                </div>
                <div>
                  <span className="text-[#F5970A]/80 text-xs font-bold uppercase tracking-wider">Nachher</span>
                  <p className="text-white/80 text-sm mt-1 leading-relaxed">{pair.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default PainSolutionSection;
