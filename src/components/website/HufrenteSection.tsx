import pascalImage from "@/assets/lp/pascal-founder.png";

const HufrenteSection = () => (
  <section id="hufrente" className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 lg:gap-16 items-center">
          <div className="md:col-span-2 relative">
            <div className="absolute inset-0 bg-primary/15 blur-[60px] scale-75" />
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10">
              <img src={pascalImage} alt="Pascal Schmid – Gründer HufManager" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          </div>
          <div className="md:col-span-3 space-y-6">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Hufrente</span>
            <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white leading-tight">Entstanden aus der Praxis.</h2>
            <div className="space-y-4 text-white/70 leading-relaxed">
              <p>HufManager ist kein Startup-Experiment. Es ist die Antwort auf ein echtes Problem. Als der Gründer nach einer Verletzung wochenlang nicht am Pferd arbeiten konnte, wurde klar: Wenn der Betrieb nur mit dem eigenen Körper läuft, fehlt ein System.</p>
              <p>Aus dieser Erfahrung entstand die Idee der <span className="text-white font-semibold">Hufrente</span> – ein Betrieb, der auch ohne dich funktioniert. Dokumentation, Kundenbindung und Abrechnung, die weiterläuft.</p>
              <p className="text-white/50 text-sm">15 Jahre Pferdebranche. Über 2.500 Pferde. Aus der Praxis, für die Praxis.</p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">PS</div>
              <div>
                <p className="font-sans text-lg font-bold text-white">Pascal Schmid</p>
                <p className="text-sm text-white/50">Gründer, HufManager</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HufrenteSection;
