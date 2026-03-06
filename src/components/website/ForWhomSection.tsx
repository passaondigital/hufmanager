import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";

const forYou = [
  "Du mobil arbeitest und Kunden an verschiedenen Orten besuchst",
  "Du Kalender, Navi und Buchhaltung in einer App haben willst",
  "Deine Kunden immer wissen sollen wann du kommst – ohne WhatsApp",
  "Du als Einzelkämpfer oder kleines Team (bis ~10 Personen) arbeitest",
  "Du im DACH-Raum tätig bist",
  "Du bereit bist 30 Minuten zu investieren um danach Stunden zu sparen",
  "Du Hufbearbeiter, Osteopath, Physio, Dentist, Reitlehrer, Sattler, Massage oder mobiler Tierarzt bist",
];

const notForYou = [
  "Du eine stationäre Praxis hast und Kunden zu dir kommen",
  "Du ein Team von 10+ Mitarbeitern mit komplexer HR-Verwaltung führst",
  "Du eine vollständige Buchhaltung wie DATEV suchst – HufManager ergänzt sie, ersetzt sie nicht",
  "Du keine digitalen Tools in deinem Arbeitsalltag möchtest",
  "Du außerhalb des DACH-Raums arbeitest",
  "Du ein reines Verwaltungstool ohne Mobilfunktionen suchst",
];

export default function ForWhomSection() {
  return (
    <section className="py-20 md:py-28 bg-zinc-950" id="fuer-wen">
      <div className="container">
        <div className="text-center mb-14">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Ehrlich gesagt</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">
            Ist HufManager das <span className="text-primary">Richtige für dich?</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* For you */}
          <div className="rounded-2xl bg-zinc-900/60 border border-primary/20 p-6 md:p-8">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </span>
              HufManager ist für dich wenn…
            </h3>
            <ul className="space-y-3">
              {forYou.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Not for you */}
          <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-6 md:p-8">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-white/50" />
              </span>
              HufManager ist nicht für dich wenn…
            </h3>
            <ul className="space-y-3">
              {notForYou.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/50 text-sm">
                  <X className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-12 space-y-6">
          <p className="text-white/60 text-lg max-w-2xl mx-auto italic">
            "HufManager ist kein Tool für jeden – und das ist gut so. Wer mobil mit Pferden arbeitet, für den haben wir jedes Detail durchdacht."
          </p>
          <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
            <a href="#demo">Jetzt kostenlos testen <ArrowRight className="ml-2 h-5 w-5" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}
