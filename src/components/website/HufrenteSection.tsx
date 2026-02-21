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
            <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white leading-tight">Weil du uns nicht egal bist.</h2>
            <div className="space-y-4 text-white/70 leading-relaxed">
              <p>
                Als Selbstständige:r weißt du: Ein Ausfall kann alles ins Wanken bringen. Genau deshalb gibt es die <span className="text-white font-semibold">Hufrente</span>.
              </p>
              <p>
                Empfehle den HufManager an Kolleginnen und Kollegen – und solange sie aktive Nutzer:innen sind, hast du einen passiven Ausfallschutz ohne Mehraufwand. Kein Kleingedrucktes. Kein Haken. Nur ein fairer Ausgleich für das, was du in die Community einbringst.
              </p>
              <p className="text-white font-semibold text-lg">Du hast aufgebaut. Wir helfen dir, es zu sichern.</p>
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
