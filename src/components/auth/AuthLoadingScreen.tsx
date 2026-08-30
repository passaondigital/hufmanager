import { FLAVOR_CONFIG } from "@/config/appFlavor";

/**
 * Einziger sichtbarer Startzustand der App.
 *
 * Wichtig: Auth-, Rollen-, Profil- und Produktpruefungen duerfen im Hintergrund
 * mehrere Schritte haben, fuer den Nutzer bleibt die Darstellung aber stabil.
 * Im HufManager wird Hufi nur als Maskottchen verwendet – nicht als eigenes
 * Produkt bzw. Assistenten-Claim.
 */
export function AuthLoadingScreen() {
  const appName = FLAVOR_CONFIG.appName || "HufManager";

  return (
    <div
      data-testid="app-startup-screen"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes hm-startup-breath {
          0%, 100% { transform: scale(1); opacity: 0.94; }
          50% { transform: scale(1.035); opacity: 1; }
        }
        @keyframes hm-startup-dot {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: 132,
          height: 132,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "hm-startup-breath 2.4s ease-in-out infinite",
        }}
      >
        <img
          src="/hufi-splash.webp"
          alt={`${appName} Maskottchen`}
          style={{ width: 126, height: 126, objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#1A1A1A",
          letterSpacing: "-0.025em",
          marginTop: 18,
        }}
      >
        {appName}
      </div>

      <div
        aria-label="Wird geladen"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 24,
          marginTop: 18,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#F97316",
              animation: "hm-startup-dot 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
