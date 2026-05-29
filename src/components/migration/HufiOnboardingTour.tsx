import { useState } from "react";

interface Props {
  onComplete: () => void;
}

interface Step {
  title: string;
  text: string;
  spotlight: SpotlightConfig | null;
}

interface SpotlightConfig {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  width: number;
  height: number;
  shape: "circle" | "rect";
}

const STEPS: Step[] = [
  {
    title: "Willkommen bei Hufi! 👋",
    text: "HufManager heißt jetzt Hufi — dein proaktiver KI-Assistent für die Pferdewelt.",
    spotlight: { top: 10, left: 12, width: 72, height: 44, shape: "rect" },
  },
  {
    title: "Das Herzstück: Dein Hufi-Button 🎤",
    text: "Tippe hier um mit Hufi zu sprechen oder zu chatten. Hufi dokumentiert, erinnert und handelt für dich.",
    spotlight: { bottom: 52, left: "50%", width: 58, height: 58, shape: "circle" },
  },
  {
    title: "Hufi ist proaktiv 🧠",
    text: "Hufi begrüßt dich täglich mit deinen Terminen, offenen Rechnungen und wichtigen Erinnerungen. Du musst nichts suchen — Hufi bringt es zu dir.",
    spotlight: null,
  },
  {
    title: "Dein Kalender 📅",
    text: "Alle Termine wie gewohnt. Neu: Hufi optimiert deine Route automatisch und erinnert dich rechtzeitig.",
    spotlight: { bottom: 10, left: "8%", width: 56, height: 56, shape: "circle" },
  },
  {
    title: "Das Archiv 📁",
    text: "Hier findest du alle Funktionen auf einen Blick — angepasst an deine Rolle als Hufpfleger.",
    spotlight: { bottom: 10, right: "8%", width: 56, height: 56, shape: "circle" },
  },
  {
    title: "HufCam Pro 📸 (NEU!)",
    text: "Fotografiere Hufe direkt in der App. Hufi analysiert automatisch mit KI — Risse, Strahlfäule, Veränderungen werden erkannt.",
    spotlight: null,
  },
  {
    title: "AutoFlow — Sprache wird Befund 🎙️ (NEU!)",
    text: "'Fridolin, Strahlfäule hinten links, Kupfersulfat behandelt' → Hufi erstellt automatisch Befund + Rechnung + Termin.",
    spotlight: null,
  },
  {
    title: "Deine Daten, deine Kontrolle 🔒",
    text: "Alles DSGVO-konform auf deutschen Servern. Unter Einstellungen → Datenschutz siehst du jederzeit was Hufi über dich weiß.",
    spotlight: null,
  },
];

const TOTAL = STEPS.length;

function SpotlightRing({ cfg }: { cfg: SpotlightConfig }) {
  const isCircle = cfg.shape === "circle";
  const style: React.CSSProperties = {
    position: "fixed",
    width: cfg.width,
    height: cfg.height,
    borderRadius: isCircle ? "50%" : 12,
    border: "3px solid #F97316",
    boxShadow: "0 0 0 6px rgba(249,115,22,0.2), 0 0 24px rgba(249,115,22,0.4)",
    animation: "pulseRing 1.4s ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 10001,
    ...(cfg.top !== undefined && { top: cfg.top }),
    ...(cfg.bottom !== undefined && { bottom: cfg.bottom }),
    ...(cfg.left !== undefined && {
      left: typeof cfg.left === "string" ? `calc(${cfg.left} - ${cfg.width / 2}px)` : cfg.left,
    }),
    ...(cfg.right !== undefined && { right: cfg.right }),
  };
  return <div style={style} />;
}

export function HufiOnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  const isFinale = step === TOTAL;
  const current = STEPS[step];

  const advance = (target: number) => {
    setFading(true);
    setTimeout(() => {
      setStep(target);
      setFading(false);
    }, 200);
  };

  const next = () => advance(step + 1);
  const skip = () => advance(TOTAL);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 1; }
          50%  { transform: scale(1.08); opacity: 0.7; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes fadeInPanel {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Spotlight ring for current step */}
      {!isFinale && current?.spotlight && (
        <SpotlightRing cfg={current.spotlight} />
      )}

      {/* Panel */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "28px 28px 0 0",
          padding: "24px 24px 40px",
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(12px)" : "translateY(0)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        {isFinale ? (
          /* ─── Final screen ─── */
          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: "#F97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
              }}
            >
              <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
              Bereit loszulegen! 🐴
            </h2>
            <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.5 }}>
              Dein Abo läuft wie gewohnt weiter.
            </p>
            <button
              onClick={onComplete}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 16,
                background: "#F97316",
                border: "none",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
                letterSpacing: "-0.2px",
              }}
            >
              Hufi starten →
            </button>
          </div>
        ) : (
          /* ─── Tour step ─── */
          <>
            {/* Progress dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === step ? "#F97316" : "#E5E7EB",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>

            {/* Step counter */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#F97316",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Schritt {step + 1} von {TOTAL}
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#1A1A1A",
                margin: "0 0 10px",
                letterSpacing: "-0.3px",
              }}
            >
              {current.title}
            </h3>

            {/* Text */}
            <p
              style={{
                fontSize: 15,
                color: "#4B5563",
                margin: "0 0 24px",
                lineHeight: 1.6,
              }}
            >
              {current.text}
            </p>

            {/* Buttons */}
            <button
              onClick={next}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                background: "#F97316",
                border: "none",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
                marginBottom: 12,
              }}
            >
              Weiter →
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={skip}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9CA3AF",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Tour überspringen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
