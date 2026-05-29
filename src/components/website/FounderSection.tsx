import { Quote } from "lucide-react";
import pascalImage from "@/assets/lp/pascal-founder.png";

interface FounderSectionProps {
  variant?: "website" | "pferdeakte";
}

const websiteIntro = `Ich bin seit fast 20 Jahren in der Pferdebranche — persönlich, privat und beruflich.

Nicht als Theoretiker von außen. Sondern mittendrin.`;

const pferdeakteIntro = `Ich entwickle Hufi nicht als Außenstehender.

Ich bin seit fast 20 Jahren Teil dieser Welt — als Hufbearbeiter, als Pferdeliebhaber, als jemand der die Branche von innen kennt.`;

const sharedBody = `Ich habe nicht den Tunnelblick eines Spezialisten — ich habe das breite Wissen von jemandem der die ganze Branche kennt. Vom der Geburt eines Fohlens bis zur Regenbogenbrücke jedes Pferdes.

Und ich bin nicht müde. Nicht ausgebrannt. Vielleicht körperlich manchmal — aber nicht im Herzen und nicht im Bewusstsein.

Ich fange erst jetzt richtig an zu brennen.

Was ich tue, tue ich seit über 10 Jahren aus tiefer Dankbarkeit gegenüber dieser Branche und den Menschen und Pferden darin.

Hufi ist kein Startup-Produkt das von außen in eine Welt reingrätscht.

Es ist das was diese Branche verdient hat — gebaut von jemandem der sie liebt.`;

export default function FounderSection({ variant = "website" }: FounderSectionProps) {
  const intro = variant === "pferdeakte" ? pferdeakteIntro : websiteIntro;
  const fullText = `${intro}\n\n${sharedBody}`;
  const paragraphs = fullText.split("\n\n").filter(Boolean);

  return (
    <section
      className="py-20 md:py-28"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="container max-w-5xl px-6">
        <div className="text-center mb-12">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "#f97316" }}
          >
            {variant === "website" ? "Warum Hufi?" : "Über den Gründer"}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            {variant === "website" ? (
              <>Gebaut von jemandem, der{" "}
                <span style={{ color: "#f97316" }}>diese Welt liebt.</span>
              </>
            ) : (
              <>Nicht von außen.{" "}
                <span style={{ color: "#f97316" }}>Von mittendrin.</span>
              </>
            )}
          </h2>
        </div>

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

              {paragraphs.map((p, i) => (
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
    </section>
  );
}
