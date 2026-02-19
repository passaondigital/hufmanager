import { CalendarClock, ClipboardCheck, Users } from "lucide-react";

const pillars = [
  { icon: CalendarClock, title: "Betrieb & Planung", description: "Touren, Termine, Routenoptimierung – alles in einer Ansicht. Kein Hin-und-Her zwischen Kalender, Maps und Notizen." },
  { icon: ClipboardCheck, title: "Nachweis & Dokumentation", description: "Hufzustand, Fotos, Behandlungsverläufe. Lückenlose Doku direkt am Pferd – auch offline." },
  { icon: Users, title: "Kunden & Bindung", description: "Kunden-App, automatische Erinnerungen, digitale Rechnungen. Deine Kunden bleiben informiert, du bleibst professionell." },
];

const PillarsSection = () => (
  <section className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="text-center mb-14">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Die 3 Säulen</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">Alles, was dein Betrieb braucht.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="relative rounded-2xl p-8 bg-zinc-900/60 border border-white/10 hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors">
              <pillar.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{pillar.title}</h3>
            <p className="text-white/60 leading-relaxed">{pillar.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PillarsSection;
