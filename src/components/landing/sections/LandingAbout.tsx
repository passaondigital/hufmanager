interface LandingAboutProps {
  aboutText: string;
}

export const LandingAbout = ({ aboutText }: LandingAboutProps) => (
  <section className="py-16 px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Über mich</h2>
      <p className="text-muted-foreground text-lg leading-relaxed text-center">{aboutText}</p>
    </div>
  </section>
);
