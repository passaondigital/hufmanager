import { Route, Navigation, BookOpen } from "lucide-react";

const features = [
  {
    icon: Route,
    title: "Optimierte Route",
    desc: "KI-gestützte Tourenplanung mit OpenRouteService – kürzeste Wege, weniger Sprit.",
  },
  {
    icon: Navigation,
    title: "Live-Navigation",
    desc: "Turn-by-Turn direkt im HufManager. DSGVO-konform, offline-fähig, kein Google Maps nötig.",
  },
  {
    icon: BookOpen,
    title: "Automatisches Fahrtenbuch",
    desc: "GPS-basierte km-Erfassung, §6 EStG konform. Tachostand, Spritkosten – alles automatisch.",
  },
];

export default function FeatureCockpitSection() {
  return (
    <section className="py-20 md:py-28 bg-black" id="cockpit">
      <div className="container">
        <div className="text-center mb-14">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Tages-Cockpit</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Dein Arbeitstag – <span className="text-primary">organisiert, navigiert, abgerechnet.</span>
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-2xl mx-auto">
            Optimierte Route mit einem Tap. Turn-by-Turn Navigation direkt im Tool. Automatisches Fahrtenbuch + Rechnung.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Mockup placeholder */}
        <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 aspect-[16/9] flex items-center justify-center">
          <div className="text-center space-y-2 text-zinc-600">
            <span className="text-5xl">🗺️</span>
            <p className="text-sm">Tages-Cockpit Screenshot</p>
          </div>
        </div>
      </div>
    </section>
  );
}
