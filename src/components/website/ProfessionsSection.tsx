const professions = [
  { icon: "🐴", title: "Hufbearbeiter", desc: "Barhuf, Beschlag, Kleben – Tourenplanung, Huffotos, Rechnungen." },
  { icon: "🦴", title: "Osteopath", desc: "Behandlungsprotokolle, Befunde, Therapiepläne – alles digital." },
  { icon: "💆", title: "Physiotherapeut", desc: "Erstbefund, Verlaufsdoku, Ganganalyse – mobil und offline." },
  { icon: "🦷", title: "Equine Dentist", desc: "Zahnstatus, Sedationszeiten, Kontrolltermine – automatisch geplant." },
  { icon: "🏇", title: "Reitlehrer", desc: "Unterrichtseinheiten, Gruppentermine, Rechnungen – ein System." },
  { icon: "🪡", title: "Sattler", desc: "Anpassungen dokumentieren, Kundentermine, Materialverwaltung." },
  { icon: "💬", title: "Massage", desc: "Behandlungsdoku, Intervalle, Kundenkommunikation – papierlos." },
  { icon: "🩺", title: "Mobiler Tierarzt", desc: "Behandlungsberichte, Medikation, Fahrten – alles in einer App." },
  { icon: "⚙️", title: "Und weitere...", desc: "Jede Berufsgruppe bekommt automatisch passende Einstellungen." },
];

export default function ProfessionsSection() {
  return (
    <section className="py-20 md:py-28 bg-black" id="berufsgruppen">
      <div className="container">
        <div className="text-center mb-14">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Alle Berufsgruppen</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Für jeden <span className="text-primary">mobilen Pferdeprofi.</span>
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-2xl mx-auto">
            Jede Berufsgruppe bekommt automatisch die passenden Zeitpuffer, Auftragstypen und Einstellungen – direkt beim Einrichten.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {professions.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-primary/30 transition-colors group"
            >
              <span className="text-3xl mb-4 block">{p.icon}</span>
              <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
