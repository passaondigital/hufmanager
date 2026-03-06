import { Sparkles } from "lucide-react";

const entries = [
  {
    date: "06. März 2026",
    title: "Client-App & Berufsgruppen-Update",
    isNew: true,
    items: [
      "✅ Tages-Cockpit für alle Berufsgruppen",
      "✅ Turn-by-Turn Navigation (ORS, EU-Server)",
      "✅ Live-Spritpreise (Tankerkönig API)",
      "✅ Automatisches Fahrtenbuch §6 EStG",
      "✅ Kundenbenachrichtigung in Echtzeit",
      "✅ Client-App: Status-Timeline live",
      "✅ Mehrere Pferdestandorte pro Kunde",
      "✅ Berufsgruppen-Onboarding (9 Typen)",
      "✅ Anhänger-Routing (Höhenbeschränkungen)",
      "✅ HelpTips in der gesamten App",
    ],
  },
];

export default function ChangelogSection() {
  return (
    <section className="py-20 md:py-28 bg-zinc-950" id="neuigkeiten">
      <div className="container">
        <div className="text-center mb-14">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Neuigkeiten</span>
          <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white mt-4">
            Was gibt es Neues?
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-xl mx-auto">
            Regelmäßige Updates, die deinen Arbeitsalltag verbessern.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          {entries.map((entry) => (
            <div key={entry.date} className="rounded-2xl bg-zinc-900/60 border border-white/5 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider flex items-center gap-2">
                    {entry.date}
                    {entry.isNew && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">🆕 NEU</span>}
                  </p>
                  <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                </div>
              </div>
              <ul className="space-y-2.5">
                {entry.items.map((item) => (
                  <li key={item} className="text-white/70 text-sm flex items-start gap-2">
                    <span className="shrink-0">{item.slice(0, 2)}</span>
                    <span>{item.slice(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
