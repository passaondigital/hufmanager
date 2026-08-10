import { useReveal, revealClass } from "./useReveal";
import heroHorse from "@/assets/lp/hero-horse.png";

const points = [
  {
    icon: "🪪",
    title: "Eine Identität, ein Leben lang",
    text: "Jedes Pferd bekommt eine Akte, die mit ihm mitgeht — vom ersten Eintrag bis zum letzten Halter, unabhängig davon, wer gerade zuständig ist.",
  },
  {
    icon: "🤝",
    title: "Alle Beteiligten, ein Bild",
    text: "Hufbearbeiter, Tierarzt, Therapeut, Besitzer — jeder sieht heute nur seinen Ausschnitt. Hufi soll diese Ausschnitte zu einem vollständigen Bild verbinden.",
  },
  {
    icon: "🐴",
    title: "Das Pferd im Mittelpunkt",
    text: "Nicht die Software, nicht die Abrechnung. Jede Funktion, die wir bauen, soll einem Ziel dienen: dem Pferd die Betreuung geben, die es als Individuum braucht.",
  },
];

const VisionSection = () => {
  const rHead = useReveal();
  const rGrid = useReveal();
  const rClosing = useReveal();
  return (
    <section className="hufi-section hufi-bg-dark-deep">
      <div className="hufi-container-wide">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-14 items-center mb-16">
          <div ref={rHead.ref} className={`flex justify-center lg:justify-start ${revealClass(rHead.visible)}`}>
            <img src={heroHorse} alt="" aria-hidden="true" className="w-full max-w-sm select-none pointer-events-none" />
          </div>
          <div className={revealClass(rHead.visible)}>
            <span className="hufi-eyebrow">Die große Vision</span>
            <h2 className="hufi-h2 text-white mt-4 mb-5">
              Hufi wird das Betriebssystem<br className="hidden md:block" /> der Pferdewelt.
            </h2>
            <p className="hufi-lede" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 560 }}>
              Heute ist Hufi ein Assistent für Hufbearbeiter. Der Anspruch ist größer: ein
              System, das versteht, erinnert, vorschlägt — und erst nach deiner Bestätigung
              handelt. Für jeden, der mit einem Pferd zu tun hat.
            </p>
          </div>
        </div>

        <div ref={rGrid.ref} className={`grid md:grid-cols-3 gap-8 ${revealClass(rGrid.visible)}`}>
          {points.map((p) => (
            <div key={p.title} className="hufi-card-signature p-7">
              <span className="text-3xl mb-4 block">{p.icon}</span>
              <h3 className="hufi-h3 mb-2.5" style={{ color: "#f97316" }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{p.text}</p>
            </div>
          ))}
        </div>

        <div ref={rClosing.ref} className={`text-center mt-16 ${revealClass(rClosing.visible)}`}>
          <p className="text-xl md:text-2xl lg:text-3xl font-extrabold leading-snug max-w-3xl mx-auto" style={{ color: "#f97316" }}>
            Von der Geburt eines Fohlens bis zur Regenbogenbrücke —<br className="hidden md:block" />
            ein System, das mitgeht.
          </p>
        </div>
      </div>
    </section>
  );
};

export default VisionSection;
