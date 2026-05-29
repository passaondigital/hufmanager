interface Props {
  onStartTour: () => void;
  onSkip: () => void;
}

const checks = [
  "Alle deine Pferde & Kunden übernommen",
  "Dein Abo läuft unverändert weiter",
  "Gleicher Login wie bisher",
  "Neue KI-Features warten auf dich",
];

export function HufManagerMigrationBanner({ onStartTour, onSkip }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "28px 28px 0 0",
          padding: "32px 24px 40px",
          width: "100%",
          maxWidth: 430,
          textAlign: "center",
          animation: "slideUpBanner 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes slideUpBanner {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Logo */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
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

        {/* Headline */}
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#1A1A1A",
            margin: "0 0 10px",
            letterSpacing: "-0.4px",
          }}
        >
          HufManager wird zu Hufi! 🐴
        </h2>

        {/* Subtext */}
        <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.5 }}>
          Deine Daten sind sicher. Dein Zugang bleibt bestehen.
          <br />
          Dein Abo läuft unverändert weiter.
        </p>

        {/* Checkmarks */}
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          {checks.map((text) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 0",
              }}
            >
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 14, color: "#166534", fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Primary Button */}
        <button
          onClick={onStartTour}
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
            marginBottom: 14,
            letterSpacing: "-0.2px",
          }}
        >
          Zeig mir was neu ist →
        </button>

        {/* Skip link */}
        <button
          onClick={onSkip}
          style={{
            background: "transparent",
            border: "none",
            color: "#9CA3AF",
            fontSize: 14,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Direkt zur App
        </button>
      </div>
    </div>
  );
}
