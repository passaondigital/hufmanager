import { Navigation, WifiOff, ShieldCheck } from "lucide-react";

export default function FeatureNavigationSection() {
  return (
    <section className="py-20 md:py-28 bg-black">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div className="order-2 md:order-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 aspect-square flex items-center justify-center">
            <div className="text-center space-y-2 text-zinc-600">
              <span className="text-5xl">🧭</span>
              <p className="text-sm">Navigation Screenshot</p>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Navigation</span>
            <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white">
              Turn-by-Turn direkt im HufManager – <span className="text-primary">kein Google Maps nötig.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Sprachansagen auf Deutsch, optimierte Routen für Transporter und Anhänger, und vollständig DSGVO-konform auf EU-Servern.
            </p>
            <div className="space-y-4">
              {[
                { icon: Navigation, text: "Sprachnavigation mit deutschen Ansagen" },
                { icon: ShieldCheck, text: "DSGVO-konform – EU-Server, keine Google-Tracker" },
                { icon: WifiOff, text: "Offline-fähig für ländliche Gebiete" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
