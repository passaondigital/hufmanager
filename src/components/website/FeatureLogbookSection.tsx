import { BookOpen, FileText, Download } from "lucide-react";

export default function FeatureLogbookSection() {
  return (
    <section className="py-20 md:py-28 bg-zinc-950">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div className="space-y-6">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Fahrtenbuch</span>
            <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white">
              §6 EStG Fahrtenbuch – <span className="text-primary">vollautomatisch.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              GPS trackt deine Kilometer automatisch. Export als PDF oder CSV – steuerfertig. Kein manuelles Eintragen mehr.
            </p>
            <div className="space-y-4">
              {[
                { icon: BookOpen, text: "GPS-basierte km-Erfassung pro Fahrt" },
                { icon: FileText, text: "§6 EStG konform – steuerlich anerkannt" },
                { icon: Download, text: "Export als PDF oder CSV – steuerfertig" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 aspect-square flex items-center justify-center">
            <div className="text-center space-y-2 text-zinc-600">
              <span className="text-5xl">📋</span>
              <p className="text-sm">Fahrtenbuch Mockup</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
