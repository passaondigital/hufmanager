import { ArrowRight } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import appDashboard from "@/assets/lp/app-dashboard.png";

const heroBadges = [
  { icon: "🔒", text: "DSGVO" },
  { icon: "🇩🇪", text: "EU-Server" },
  { icon: "📱", text: "Kein App Store" },
];

const HeroSection = () => {
  const r = useReveal(0.01);
  return (
    <section className="relative hufi-bg-darker overflow-hidden" style={{ minHeight: "100svh", display: "flex", alignItems: "center" }}>
      <div
        className="hufi-anim-glow"
        style={{
          position: "absolute", top: "12%", left: "55%", transform: "translateX(-50%)",
          width: "min(1000px, 130vw)", height: "min(1000px, 130vw)", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      <div className="hufi-container-wide relative z-10" style={{ paddingTop: 128, paddingBottom: 64 }}>
        <div ref={r.ref} className={`grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-16 lg:gap-14 items-center ${revealClass(r.visible)}`}>
          {/* ── Left: Text ── */}
          <div className="text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide mb-8"
              style={{ border: "1px solid rgba(249,115,22,0.25)", color: "#F97316", backgroundColor: "rgba(249,115,22,0.07)", letterSpacing: "0.04em" }}
            >
              <span className="hufi-anim-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F97316", display: "inline-block", flexShrink: 0 }} />
              Für Hufbearbeiter &amp; Hufschmiede · Sprachassistent live
            </div>

            <h1 className="hufi-h1 text-white mb-6">
              <span style={{ background: "linear-gradient(135deg, #F97316 0%, #fb923c 50%, #F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                HUFI KENNT DICH.
              </span>
            </h1>

            <p className="hufi-lede mx-auto lg:mx-0" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 520 }}>
              Der digitale Assistent für Pferd, Kundschaft und dein Business — hört zu, denkt mit
              und übernimmt Verwaltung, damit mehr Zeit fürs Pferd bleibt.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-9">
              <a href="/auth" className="hufi-btn-primary" style={{ fontSize: 15, padding: "16px 34px" }}>
                Kostenlos starten
                <ArrowRight style={{ width: 18, height: 18 }} />
              </a>
              <a href="#problem" className="hufi-btn-ghost" style={{ fontSize: 15, padding: "16px 28px" }}>
                Wie funktioniert es?
              </a>
            </div>

            <p className="mt-4" style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
              Kein App Store · Keine Kreditkarte · Jederzeit kündbar
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-7">
              {heroBadges.map((b) => (
                <span
                  key={b.text}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.32)",
                    backgroundColor: "rgba(255,255,255,0.025)", display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{b.icon}</span> {b.text}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: echter Screenshot statt erfundener Fake-UI ── */}
          <div className="relative hufi-anim-float mx-auto" style={{ animationDelay: "0.3s", maxWidth: 560, width: "100%" }}>
            <div className="absolute inset-0 rounded-[28px] blur-[70px] scale-95 -z-10" style={{ backgroundColor: "rgba(249,115,22,0.16)" }} />
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 40px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: "#1a1a1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#eab308" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e" }} />
              </div>
              <img src={appDashboard} alt="Hufi Dashboard — echter Screenshot der App" className="w-full h-auto block" />
            </div>

            {/* Voice callout — belegtes Live-Feature */}
            <div
              className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(15,15,15,0.9)", border: "1px solid rgba(249,115,22,0.3)", backdropFilter: "blur(12px)" }}
            >
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🎙️</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#f97316", margin: 0 }}>„Hey Hufi, wer ist als nächstes dran?"</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: 0 }}>Sprachsteuerung, hände­frei im Stall</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
