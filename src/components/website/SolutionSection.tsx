import { Check } from "lucide-react";

const benefits = [
  { text: "Ruhe im Kopf", detail: "weil alles an einem Ort ist – für jede Berufsgruppe" },
  { text: "Einen entspannten Feierabend", detail: "weil die Verwaltung nicht auf dich wartet" },
  { text: "Zufriedenere Kunden und Pferde", detail: "weil du präsenter bist, wo es zählt" },
  { text: "Echte Vernetzung", detail: "weil alle Beteiligten digital zusammenarbeiten" },
];

const SolutionSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Unser Versprechen</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Ab jetzt läuft das <span className="text-primary">anders.</span>
          </h2>
          <p className="text-white/60 text-lg mt-4">Mit dem Hufi bekommt jeder Pferde-Profi:</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-12">
          {benefits.map((b) => (
            <div key={b.text} className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-primary/30 transition-colors group">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-white font-semibold">{b.text}</p>
                <p className="text-white/50 text-sm mt-1">– {b.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Während du deine Arbeit am Pferd machst, hält der Hufi dir den Rücken frei – egal ob du Hufe bearbeitest, therapierst oder trainierst.
          </p>
          <p className="text-2xl md:text-3xl font-extrabold text-primary">Die Pferde.</p>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-white/5">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Claim</p>
          <p className="text-xl md:text-2xl font-bold text-white">Einfach. Schnell. Sicher. – <span className="text-primary">Hufi.</span></p>
          <p className="text-white/50 mt-2">Die All-in-One Plattform für Pferde-Profis.</p>
        </div>
      </div>
    </div>
  </section>
);

export default SolutionSection;
