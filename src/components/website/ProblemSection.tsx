import { X } from "lucide-react";

const problems = [
  "Zettel, Klemmbrett und Aktenordner mitschleppen.",
  "Jedem Kunden alles dreimal erklären.",
  "Abends Rechnungen schreiben statt Feierabend machen.",
  "No-Shows, weil Kunden den Termin vergessen haben.",
  "Diskussionen über Hufzustände ohne Foto-Nachweis.",
  '"Kannst du mal kurz…"-Nachrichten nach 20 Uhr.',
];

const ProblemSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="text-center mb-12">
        <span className="text-red-500 font-bold text-sm uppercase tracking-widest">Schluss damit</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">Du musst nicht mehr...</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {problems.map((problem, index) => (
          <div key={index} className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-colors group">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
              <X className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-white/80 leading-relaxed">{problem}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;
