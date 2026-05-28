import { Star, Quote } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  region: string;
  quote: string;
  placeholder?: boolean;
}

const testimonials: Testimonial[] = [
  {
    name: "Heiko W.",
    role: "Hufpfleger",
    region: "Norddeutschland",
    quote: "Früher hab ich nach dem letzten Pferd noch eine Stunde am Schreibtisch gesessen. Heute fahr ich heim — Hufi hat die Rechnung schon raus.",
    placeholder: true,
  },
  {
    name: "Sandra M.",
    role: "Pferdeosteopathin",
    region: "Bayern",
    quote: "Die Pferdeakte ist Gold wert. Ich sehe auf einen Blick was der Hufpfleger vor mir dokumentiert hat — das spart Zeit und schützt das Pferd.",
    placeholder: true,
  },
  {
    name: "Tim K.",
    role: "Hufschmied",
    region: "NRW",
    quote: "\"Neue Rechnung für Bella\" — Hufi macht den Rest. Das klingt simpel, aber das ist genau das was ich nach einem 10-Stunden-Tag brauche.",
    placeholder: true,
  },
  {
    name: "Melanie R.",
    role: "Reitlehrerin & Stallbetreiberin",
    region: "Baden-Württemberg",
    quote: "Ich manage 30 Pferde und 5 Dienstleister. Vorher: Chaos in drei WhatsApp-Gruppen. Jetzt: Ein Blick auf Hufi und ich weiß alles.",
    placeholder: true,
  },
  {
    name: "Jonas F.",
    role: "Hufpfleger",
    region: "Sachsen",
    quote: "Die Tourenplanung allein hat mein Leben verändert. 4 Stops weniger Umweg pro Woche — das sind 2 Stunden die ich mit meiner Familie bin.",
    placeholder: true,
  },
  {
    name: "Petra N.",
    role: "Pferdebesitzerin",
    region: "Hessen",
    quote: "Als Pferdebesitzerin kostenlos dabei zu sein war ich skeptisch. Aber die Pferdeakte für meine Stute ist einfach perfekt — alles an einem Ort.",
    placeholder: true,
  },
];

const TestimonialsSection = () => (
  <section className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[#F5970A] font-bold text-sm uppercase tracking-widest">Stimmen aus der Praxis</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Was Pferdeprofis sagen
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative p-6 rounded-2xl border border-white/10 bg-zinc-900/50 flex flex-col"
            >
              {t.placeholder && (
                <span className="absolute top-3 right-3 text-[9px] font-mono text-white/20 uppercase tracking-wider">
                  Echtes Zitat folgt
                </span>
              )}
              <Quote className="h-8 w-8 text-[#F5970A]/30 mb-4" />
              <p className="text-white/80 leading-relaxed flex-1 text-sm">
                „{t.quote}"
              </p>
              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-3.5 w-3.5 text-[#F5970A] fill-[#F5970A]" />
                  ))}
                </div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-white/40 text-xs">{t.role} · {t.region}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
