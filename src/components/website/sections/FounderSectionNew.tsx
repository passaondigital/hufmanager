import { Quote } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import pascalImage from "@/assets/lp/pascal-founder.png";

const FounderSectionNew = () => {
  const r = useReveal();
  return (
    <section className="hufi-section hufi-bg-white">
      <div className="hufi-container-standard">
        <div ref={r.ref} className={`grid md:grid-cols-[0.8fr_1.2fr] gap-12 items-center ${revealClass(r.visible)}`}>
          <div className="relative mx-auto md:mx-0 w-full max-w-xs">
            <div className="absolute -inset-3 rounded-2xl blur-2xl opacity-20" style={{ backgroundColor: "#f97316" }} />
            <img
              src={pascalImage}
              alt="Pascal Schmid – Gründer Hufi"
              className="relative w-full aspect-[3/4] object-cover rounded-2xl border border-black/5 shadow-xl"
            />
          </div>

          <div>
            <span className="hufi-eyebrow">Der Mensch hinter Hufi</span>
            <Quote className="w-9 h-9 my-4 opacity-25" style={{ color: "#f97316" }} />
            <p className="text-xl md:text-2xl font-bold leading-snug text-gray-900 mb-6">
              „Ich bin seit fast 20 Jahren in der Pferdebranche — mittendrin, nicht als
              Theoretiker von außen. Hufi ist kein Startup-Produkt, das von außen in eine Welt
              reingrätscht. Es ist das, was diese Branche verdient hat."
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-lg">
              Von Hufbearbeitern über Stallbetreiber bis Tierärzte — Pascal kennt die ganze
              Branche aus eigener Erfahrung, nicht nur einen Ausschnitt davon.
            </p>
            <div>
              <p className="font-bold text-gray-900">Pascal Schmid</p>
              <p className="text-sm text-gray-500">Gründer Hufi · Hufbearbeiter & Barhufexperte</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderSectionNew;
