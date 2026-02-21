import { X } from "lucide-react";

const painPoints = [
  "Terminsuche, Schieberei und No-Shows, die dich Zeit, Nerven und Geld kosten",
  "Endlose WhatsApp-Verläufe, die mehr Chaos erzeugen als lösen",
  "Unleserliche, zerknitterte oder verlorene Pferdedaten und Notizen",
  "Umsatzverluste, die du gar nicht bemerkst – weil du keine Zeit hast, hinzuschauen",
];

const ProblemSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-red-500 font-bold text-sm uppercase tracking-widest">Kommt dir das bekannt vor?</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Du hast gerade einen langen Tag hinter dir&nbsp;–
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-3xl mx-auto leading-relaxed">
            und dann fängt die eigentliche Arbeit erst an. Termine suchen, verschieben, nachhaken. WhatsApp-Nachrichten, die sich über Wochen ziehen. Zettel, die irgendwo zwischen Halfter und Hufmesser verschwinden. Und am Ende des Monats das ungute Gefühl: <span className="text-white font-semibold">War das wirklich alles, was ich verdient habe?</span>
          </p>
        </div>

        <div className="text-center mb-8">
          <span className="text-red-500 font-bold text-lg">Schluss damit.</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {painPoints.map((point, index) => (
            <div key={index} className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-colors group">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-white/80 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProblemSection;
