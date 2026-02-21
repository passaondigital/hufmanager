import { Shield, Server, Heart } from "lucide-react";

const trustValues = [
  { icon: Shield, title: "Datenschutz", text: "DSGVO-konform. Deutsche Server. Verschlüsselte Übertragung." },
  { icon: Heart, title: "Pferdeschutz", text: "Gebaut für Menschen, die ihr Herz für Pferde geben." },
  { icon: Server, title: "Innovation", text: "Der modernste Werkzeugkasten für die gesamte Pferdebranche." },
];

const TrustSection = () => (
  <section className="py-16 md:py-20 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Vertrauen</span>
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-white mt-4">
          Pferdeschutz und Datenschutz – aus Überzeugung.
        </h2>
        <p className="text-white/50 mt-3">Weil Vertrauen die Grundlage für alles ist – bei Pferden wie bei Software.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {trustValues.map((v) => (
          <div key={v.title} className="text-center p-6 rounded-xl bg-zinc-900/40 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <v.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{v.title}</h3>
            <p className="text-white/50 text-sm">{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
