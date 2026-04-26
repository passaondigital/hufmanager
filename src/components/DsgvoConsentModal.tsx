interface Props {
  onConsent: (granted: boolean) => void;
}

export function DsgvoConsentModal({ onConsent }: Props) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 300,
      }} />
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 301,
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        padding: "28px 20px 44px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
          }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", margin: 0 }}>
              Hufi — Datenschutz
            </p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
              Einwilligung erforderlich (DSGVO Art. 6)
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 16 }}>
          Damit ich dir <strong>proaktiv helfen</strong> kann, benötige ich deine
          Einwilligung zur Verarbeitung deiner <strong>Pferde- und Termindaten</strong>.
        </p>

        <div style={{
          background: "#F9FAFB", borderRadius: 12,
          padding: "12px 14px", marginBottom: 22,
          border: "1px solid #F0F0F0",
        }}>
          <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.7 }}>
            ✓ Termindaten für proaktive Erinnerungen<br />
            ✓ Pferdeakten für Befund-Analyse<br />
            ✓ Sprachinhalte zur KI-Verbesserung<br />
            ✗ Keine Weitergabe an Dritte<br />
            ✗ Keine Werbung
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onConsent(false)}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              background: "#F3F4F6", color: "#6B7280",
              border: "none", cursor: "pointer",
              fontSize: 15, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            Ablehnen
          </button>
          <button
            onClick={() => onConsent(true)}
            style={{
              flex: 2, height: 48, borderRadius: 12,
              background: "#F97316", color: "#FFFFFF",
              border: "none", cursor: "pointer",
              fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
            }}
          >
            Einwilligen ✓
          </button>
        </div>

        <button
          onClick={() => window.open("https://assaon.com/datenschutz", "_blank")}
          style={{
            width: "100%", marginTop: 12, padding: "8px 0",
            background: "transparent", border: "none",
            color: "#9CA3AF", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Details ansehen →
        </button>
      </div>
    </>
  );
}
