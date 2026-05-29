import { useState } from "react";
import pascalImage from "@/assets/lp/pascal-founder.png";
import { Slider } from "@/components/ui/slider";

const HufrenteSection = () => {
  const [referrals, setReferrals] = useState([5]);
  const commissionPerReferral = 9.80;
  const monthly = referrals[0] * commissionPerReferral;
  const aboCost = 49;
  const net = monthly - aboCost;

  return (
    <section id="hufrente" className="py-20 md:py-28 bg-black">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 lg:gap-16 items-center">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-0 bg-primary/15 blur-[60px] scale-75" />
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10">
                <img src={pascalImage} alt="Pascal Schmid – Gründer Hufi" className="w-full h-full object-cover" loading="lazy" />
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
                  Empfehle den Hufi an Kolleginnen und Kollegen – und solange sie aktive Nutzer:innen sind, erhältst du <span className="text-white font-semibold">20% ihrer Monatsgebühr als Provision</span>. Automatisch. Monatlich. Dauerhaft.
                </p>
              </div>

              {/* How it works - 3 steps */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { emoji: "🤝", label: "Empfehlen", desc: "Link teilen" },
                  { emoji: "💰", label: "Verdienen", desc: "20% lebenslang" },
                  { emoji: "🛡️", label: "Absichern", desc: "Passives Einkommen" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl border border-white/10 bg-white/5">
                    <span className="text-2xl">{s.emoji}</span>
                    <p className="text-white font-semibold text-sm mt-1">{s.label}</p>
                    <p className="text-white/50 text-xs">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Mini Calculator */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                <p className="text-white font-semibold text-sm">Provisionsrechner</p>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Empfohlene Kollegen</span>
                  <span className="text-white font-bold text-lg">{referrals[0]}</span>
                </div>
                <Slider
                  value={referrals}
                  onValueChange={setReferrals}
                  max={20}
                  min={1}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Provision/Monat</span>
                    <span className="text-white font-semibold">{monthly.toFixed(2)}&nbsp;€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Dein Abo-Kosten</span>
                    <span className="text-white/60">−{aboCost.toFixed(2)}&nbsp;€</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-white font-semibold">{net >= 0 ? "Netto-Verdienst" : "Differenz"}</span>
                    <span className={`font-bold ${net >= 0 ? "text-primary" : "text-white/60"}`}>
                      {net >= 0 ? "+" : ""}{net.toFixed(2)}&nbsp;€/Monat
                    </span>
                  </div>
                </div>
                {referrals[0] >= 5 && (
                  <p className="text-xs text-white/50 text-center">
                    Ab {referrals[0]} Empfehlungen ist Hufi für dich kostenlos.
                    {net > 0 && ` Plus ${net.toFixed(2)}€ passives Einkommen.`}
                  </p>
                )}
              </div>

              {/* Legal note */}
              <p className="text-xs text-white/40 leading-relaxed">
                Affiliate Marketing ist vollkommen legal und in DE, AT und CH weit verbreitet.
                Amazon macht es. Booking.com macht es. Wir auch. Kein Schneeballsystem — du verdienst nur wenn dein Kollege ein echtes Produkt nutzt.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">PS</div>
                <div>
                  <p className="font-sans text-lg font-bold text-white">Pascal Schmid</p>
                  <p className="text-sm text-white/50">Gründer, Hufi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HufrenteSection;
