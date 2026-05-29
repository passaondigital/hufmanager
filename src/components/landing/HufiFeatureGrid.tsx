import { useEffect, useRef, useState } from "react";

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const features = [
  {
    icon: "🎙️",
    title: "Hufi spricht mit dir",
    desc: "Echtzeit-Sprachassistent, Wake-Word \"Hey Hufi\", TTS mit echter Stimme — hände­frei im Stall.",
  },
  {
    icon: "📋",
    title: "Vollständige Pferdeakten",
    desc: "Vollständigkeits-Score, automatische Erinnerungen — jedes Pferd lückenlos dokumentiert.",
  },
  {
    icon: "📅",
    title: "Tagesroute optimieren",
    desc: "Google Maps Integration, Reihenfolge nach Fahrzeit — weniger fahren, mehr erledigen.",
  },
  {
    icon: "💬",
    title: "WhatsApp & E-Mail",
    desc: "Vorlagenbasiert, ein Tap sendet — Kundschaft informieren ohne Aufwand.",
  },
  {
    icon: "🧠",
    title: "Hufi lernt von dir",
    desc: "Memory-System, kontextbewusste Antworten — Hufi kennt deinen Betrieb wie du selbst.",
  },
  {
    icon: "🔒",
    title: "100% DSGVO",
    desc: "EU-Server, keine KI-Trainings mit deinen Daten, jederzeit exportierbar — volle Kontrolle.",
  },
];

const HufiFeatureGrid = () => {
  const rHead = useReveal();
  const rGrid = useReveal();

  return (
    <section
      style={{
        padding: "80px 20px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          ref={rHead.ref}
          style={{
            textAlign: "center",
            marginBottom: 48,
            transition: "all 0.7s ease-out",
            opacity: rHead.visible ? 1 : 0,
            transform: rHead.visible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#F97316",
              display: "block",
              marginBottom: 12,
            }}
          >
            Was Hufi kann
          </span>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 900,
              color: "#1A1A1A",
              lineHeight: 1.15,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            Alles was du brauchst.<br />Nichts was du nicht brauchst.
          </h2>
          <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 500, margin: "0 auto" }}>
            Sechs Kernfunktionen die deinen Betriebsalltag wirklich verändern.
          </p>
        </div>

        <div
          ref={rGrid.ref}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            transition: "all 0.7s ease-out",
            opacity: rGrid.visible ? 1 : 0,
            transform: rGrid.visible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: "28px 24px",
                borderRadius: 16,
                border: "1px solid #F3F4F6",
                backgroundColor: "#FAFAFA",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(249,115,22,0.35)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "#F3F4F6")
              }
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#1A1A1A",
                  marginBottom: 6,
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HufiFeatureGrid;
