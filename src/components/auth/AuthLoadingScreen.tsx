export function AuthLoadingScreen() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFFFF",
      flexDirection: "column",
      gap: 0,
    }}>
      <style>{`
        @keyframes hufi-breath { 0%,100%{transform:scale(1);opacity:0.92} 50%{transform:scale(1.06);opacity:1} }
        @keyframes hufi-bar {
          0%   { transform: scaleY(0.2); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.2); }
        }
        .hufi-bar { animation: hufi-bar 1.4s ease-in-out infinite alternate; transform-origin: center; }
      `}</style>

      <div style={{ animation: "hufi-breath 2.8s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="https://upload.assaon.com/files/medien/goldenespferd.png"
          alt="Hufi"
          style={{ width: 130, height: 130, objectFit: "contain" }}
        />
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em", marginTop: 24, marginBottom: 4 }}>
        Hufi
      </div>
      <div style={{ fontSize: 12, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 32 }}>
        Dein Hufpflege-Assistent
      </div>

      {/* Wave bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 28 }}>
        {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1].map((h, i) => (
          <div
            key={i}
            className="hufi-bar"
            style={{
              width: 4,
              height: `${Math.round(h * 100)}%`,
              borderRadius: 99,
              background: "#F97316",
              opacity: 0.7 + h * 0.3,
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${1.2 + (i % 3) * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
