import { useState, useEffect } from "react";

const LOGO = "https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 1700);
    const t3 = setTimeout(() => onDone(), 2050);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "radial-gradient(ellipse at center, #1a0e00 0%, #0a0700 60%, #000000 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      transition: "opacity 0.35s ease",
      opacity: phase === "out" ? 0 : 1,
      pointerEvents: "none",
    }}>
      <style>{`
        @keyframes horseIn {
          0%  { transform: scale(0.65) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100%{ transform: scale(1)    rotate(0deg); opacity: 1; }
        }
        @keyframes goldGlow {
          0%,100% { filter: sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.3) drop-shadow(0 0 18px rgba(212,175,55,0.6)); }
          50%      { filter: sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.6) drop-shadow(0 0 36px rgba(212,175,55,0.9)); }
        }
        @keyframes textIn {
          from { opacity: 0; letter-spacing: 12px; }
          to   { opacity: 1; letter-spacing: 4px; }
        }
        @keyframes subIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .splash-horse { animation: horseIn 0.55s cubic-bezier(.34,1.56,.64,1) forwards, goldGlow 2.5s ease-in-out 0.55s infinite; }
        .splash-title { animation: textIn 0.5s 0.5s ease-out forwards; opacity: 0; }
        .splash-sub   { animation: subIn  0.4s 0.85s ease-out forwards; opacity: 0; }
      `}</style>

      {/* Golden horse icon */}
      <div style={{ width: 110, height: 110, marginBottom: 28 }}>
        <img
          src={LOGO}
          alt="Hufi"
          className="splash-horse"
          style={{
            width: "100%", height: "100%", objectFit: "contain",
            filter: "sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.3)",
          }}
        />
      </div>

      <div className="splash-title" style={{
        fontSize: 40, fontWeight: 900, color: "#D4AF37",
        fontFamily: "'Bebas Neue', sans-serif",
        letterSpacing: "4px", lineHeight: 1,
        textShadow: "0 0 24px rgba(212,175,55,0.5)",
      }}>
        HUFI
      </div>
      <div className="splash-sub" style={{
        fontSize: 12, color: "rgba(212,175,55,0.55)",
        marginTop: 10, letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        Dein Pferd. Dein Team. Deine Daten.
      </div>
    </div>
  );
}
