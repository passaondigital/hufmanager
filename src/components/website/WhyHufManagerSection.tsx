import { useEffect, useRef, useState } from "react";
import { ChevronDown, Quote } from "lucide-react";
import pascalImage from "@/assets/lp/pascal-founder.png";

/* ── reveal hook ── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const rc = (v: boolean, extra = "") =>
  `transition-all duration-[600ms] ease-out ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${extra}`;

/* ── data ── */
const cards = [
  {
    icon: "📋",
    title: "Ich wusste nichts über das Pferd.",
    text: "Keine Krankheiten, keine Verhaltensauffälligkeiten, keine individuellen Bedürfnisse. Man kann einem Pferd nicht so helfen wie es braucht, wenn man es nicht kennt. Das kostet Zeit, Energie, Geld — und schadet der Mensch-Pferd-Beziehung.",
  },
  {
    icon: "📄",
    title: "Die Papiere waren unvollständig oder fehlten ganz.",
    text: "Dinge wurden verschwiegen. Wichtiges geriet in Vergessenheit oder wurde für unwichtig befunden. Vieles hätte sich ersparen lassen — für Mensch und Pferd.",
  },
  {
    icon: "🔄",
    title: "Im hektischen Alltag hat man nicht alles auf dem Schirm.",
    text: "Auch bei eigenen Pferden. Man kann sich nicht alles merken. Nicht alles festhalten. Nicht immer überall dabei sein. Das ist keine Schwäche — das ist Realität.",
  },
];

const timeline = [
  { period: "4.000 v. Chr.", what: "Nahrung & erste Domestizierung" },
  { period: "3.500 v. Chr.", what: "Mobilität — Reiten verändert alles" },
  { period: "2.000 v. Chr.", what: "Krieg & Transport (Streitwagen)" },
  { period: "Ab 900 n. Chr.", what: "Landwirtschaft (Kummet & Hufeisen)" },
  { period: "Heute", what: "?" },
];

const founderParagraphs = [
  "Ich bin seit fast 20 Jahren in der Pferdebranche — persönlich, privat und beruflich.",
  "Nicht als Theoretiker von außen. Sondern mittendrin.",
  "Vom der Geburt eines Fohlens bis zur Regenbogenbrücke jedes Pferdes.",
  "Ich habe nicht den Tunnelblick eines Spezialisten — ich habe das breite Wissen von jemandem der die ganze Branche kennt.",
  "Und ich bin nicht müde. Nicht ausgebrannt. Vielleicht körperlich manchmal — aber nicht im Herzen und nicht im Bewusstsein.",
  "Ich fange erst jetzt richtig an zu brennen.",
  "Was ich tue, tue ich seit über 10 Jahren aus tiefer Dankbarkeit gegenüber dieser Branche und den Menschen und Pferden darin.",
  "Hufi ist kein Startup-Produkt das von außen in eine Welt reingrätscht.",
  "Es ist das was diese Branche verdient hat — gebaut von jemandem der sie liebt.",
];

export default function WhyHufManagerSection() {
  const rIntro = useReveal();
  const rCard0 = useReveal();
  const rCard1 = useReveal();
  const rCard2 = useReveal();
  const rAfter = useReveal();
  const rHistory = useReveal();
  const rTable = useReveal();
  const rFounder = useReveal();
  const rCta = useReveal();
  const cardReveals = [rCard0, rCard1, rCard2];

  return (
    <>
      {/* ━━━ INTRO + CARDS (white bg) ━━━ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          {/* Intro */}
          <div ref={rIntro.ref} className={`text-center mb-14 ${rc(rIntro.visible)}`}>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4"
              style={{ color: "#0a0a0a" }}
            >
              Drei Szenarien. Jeder kennt sie.
            </h2>
            <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
              Ich hatte Pferde vor und bei mir — und jedes dieser Szenarien ist mir persönlich begegnet.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {cards.map((card, i) => (
              <div
                key={i}
                ref={cardReveals[i].ref}
                className={rc(cardReveals[i].visible)}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div
                  className="rounded-2xl p-6 md:p-8 h-full flex flex-col"
                  style={{ backgroundColor: "#0a0a0a" }}
                >
                  <span className="text-3xl mb-4 block">{card.icon}</span>
                  <h3
                    className="text-lg font-bold mb-3 leading-snug"
                    style={{ color: "#f97316" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed flex-1"
                    style={{ color: "rgba(255,255,255,.7)" }}
                  >
                    {card.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* After-cards text */}
          <div ref={rAfter.ref} className={`text-center ${rc(rAfter.visible)}`}>
            <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: "#6b7280" }}>
              Das sind keine Ausnahmen. Das ist Pferdealltag.
              <br />
              Darum gibt es Hufi.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ HISTORICAL BLOCK (dark bg) ━━━ */}
      <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="max-w-4xl mx-auto px-6">
          <div ref={rHistory.ref} className={rc(rHistory.visible)}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white mb-10 text-center">
              Vor über 5.500 Jahren hat das Pferd{" "}
              <span style={{ color: "#f97316" }}>die Welt des Menschen verändert.</span>
            </h2>

            <div className="space-y-5 mb-14">
              {[
                "Um 4.000 vor Christus, in der zentralasiatischen Steppe, begann eine der folgenreichsten Partnerschaften der Menschheitsgeschichte.",
                "Zuerst als Nahrungsquelle. Dann als Reittier. Dann als Kriegsmaschine, als Pflüger, als Bote — als erster 'Breitbandanschluss' der Geschichte, der Kontinente vernetzte bevor es Kabel gab.",
                "Das Kummet ermöglichte schwere Feldarbeit. Das Hufeisen schützte seinen Schritt. Die Kavallerie veränderte Kriege. Der Streitwagen veränderte Reiche.",
                "Ohne das Pferd hätten wir Menschen diese Fortschritte niemals so gemacht — oder um Jahrhunderte langsamer.",
              ].map((p, i) => (
                <p
                  key={i}
                  className="text-base md:text-lg leading-relaxed"
                  style={{ color: "rgba(255,255,255,.75)" }}
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Table */}
            <div
              ref={rTable.ref}
              className={`rounded-xl overflow-hidden ${rc(rTable.visible)}`}
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#f97316" }}>
                      Zeitraum
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#f97316" }}>
                      Was das Pferd ermöglichte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((row, i) => {
                    const isLast = i === timeline.length - 1;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.06)",
                        }}
                      >
                        <td
                          className="px-5 py-3 text-sm font-semibold whitespace-nowrap"
                          style={{ color: isLast ? "#f97316" : "rgba(255,255,255,.85)" }}
                        >
                          {row.period}
                        </td>
                        <td
                          className="px-5 py-3 text-sm"
                          style={{ color: isLast ? "#f97316" : "rgba(255,255,255,.6)" }}
                        >
                          <span className="flex items-center gap-2">
                            {row.what}
                            {isLast && (
                              <ChevronDown
                                className="w-4 h-4 animate-bounce"
                                style={{ color: "#f97316" }}
                              />
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ GRÜNDER BLOCK (dark bg, seamless) ━━━ */}
      <section style={{ backgroundColor: "#0a0a0a" }} className="pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto px-6">
          <div
            ref={rFounder.ref}
            className={rc(rFounder.visible)}
          >
            <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start">
              {/* Text column */}
              <div className="flex-1 relative">
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-full hidden md:block"
                  style={{ backgroundColor: "#f97316" }}
                />
                <div className="md:pl-8 space-y-5">
                  <Quote
                    className="w-8 h-8 mb-2 opacity-30"
                    style={{ color: "#f97316" }}
                  />
                  {founderParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-base md:text-lg leading-relaxed"
                      style={{ color: "rgba(255,255,255,.75)" }}
                    >
                      {p}
                    </p>
                  ))}
                </div>
                <div className="md:pl-8 mt-10 pt-6 border-t border-white/10">
                  <p className="text-white font-bold text-lg">Pascal Schmid</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,.45)" }}>
                    Gründer Hufi · Hufbearbeiter &amp; Barhufexperte
                  </p>
                </div>
              </div>

              {/* Photo column */}
              <div className="w-full md:w-64 lg:w-72 shrink-0 mx-auto md:mx-0">
                <div className="relative">
                  <div
                    className="absolute -inset-3 rounded-2xl blur-2xl opacity-20"
                    style={{ backgroundColor: "#f97316" }}
                  />
                  <img
                    src={pascalImage}
                    alt="Pascal Schmid – Gründer Hufi"
                    className="relative w-full aspect-[3/4] object-cover rounded-2xl border border-white/10"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ CTA BLOCK (orange bg) ━━━ */}
      <section className="py-20 md:py-28" style={{ backgroundColor: "#f97316" }}>
        <div
          ref={rCta.ref}
          className={`max-w-4xl mx-auto px-6 text-center ${rc(rCta.visible)}`}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-snug mb-6">
            Pferde können nicht sprechen.
            <br />
            Aber wir können ihnen eine Stimme geben —
            <br className="hidden md:block" />
            die sie sich nach über 5.500 Jahren
            <br className="hidden md:block" />
            an unserer Seite verdient haben.
          </h2>
          <p className="text-sm md:text-base text-white/80 max-w-2xl mx-auto">
            Und wir können endlich die Intransparenz auflösen die uns alle — Profis, Besitzer, Pferde — jeden Tag unnötig kostet.
          </p>
        </div>
      </section>
    </>
  );
}
