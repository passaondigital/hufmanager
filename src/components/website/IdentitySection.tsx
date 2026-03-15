const IdentitySection = () => (
  <section className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Unsere Philosophie</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Pferdeschutz und Datenschutz sind keine Gegensätze.{" "}
          <span className="text-primary">Sie sind dasselbe.</span>
        </h2>
        <div className="space-y-4 text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
          <p>
            HufManager wurde gegründet von einem Pferdeprofi mit fast 20 Jahren Erfahrung in der Pferdebranche. Nicht aus einem Büro heraus. Aus dem Stall. Von der Praxis – für die Praxis. Für die Menschen, die täglich mit Pferden leben und arbeiten.
          </p>
        </div>
        <div className="pt-4">
          <p className="text-white font-semibold text-xl">Pascal Schmid</p>
          <p className="text-white/50 text-sm">Gründer HufManager · Barhufpfleger & Equine Tech Founder</p>
        </div>
      </div>
    </div>
  </section>
);

export default IdentitySection;
