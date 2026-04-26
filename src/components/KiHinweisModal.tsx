import { updateHufiMemory } from "@/lib/hufi-brain";

interface Props {
  open: boolean;
  userId?: string;
  onConsent: () => void;
  onDecline: () => void;
}

const CHECKS = [
  "Deine Nachrichten werden zur Verarbeitung an Anthropic-Server (USA) übermittelt",
  "Grundlage: EU-Standardvertragsklauseln (SCC) nach Art. 46 DSGVO",
  "Anthropic speichert keine Daten nach Verarbeitung",
  "Keine Nutzung für KI-Training (API-Vertrag)",
  "Pferdeakten bleiben auf EU-Servern (Supabase)",
];

export function KiHinweisModal({ open, userId, onConsent, onDecline }: Props) {
  if (!open) return null;

  function saveConsent(granted: boolean) {
    const value = granted ? "granted" : "denied";
    localStorage.setItem("hufi_ki_consent", value);
    if (userId) {
      updateHufiMemory(
        userId,
        "dsgvo",
        "ki_consent_anthropic",
        { granted, ts: new Date().toISOString(), provider: "anthropic" },
        "system",
      );
    }
  }

  function handleConsent() {
    saveConsent(true);
    onConsent();
  }

  function handleDecline() {
    saveConsent(false);
    onDecline();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        padding: "28px 24px 44px",
        width: "100%",
        maxWidth: 430,
        maxHeight: "88vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", margin: 0, lineHeight: 1.3 }}>
            KI-Hinweis (Pflichtangabe nach EU AI Act)
          </h2>
        </div>

        {/* Info box */}
        <div style={{
          background: "#F9FAFB", border: "1px solid #E5E7EB",
          borderRadius: 16, padding: "16px 18px", marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 12px", fontWeight: 600 }}>
            Hufi nutzt KI-Technologie von Anthropic (USA).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHECKS.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#10B981", fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: "0 0 24px" }}>
          Du kommunizierst mit einer KI — nicht mit einem Menschen. Hufi kann Fehler machen.{" "}
          <strong style={{ color: "#374151" }}>Medizinische Entscheidungen immer mit einem Tierarzt absprechen.</strong>
        </p>

        {/* Buttons */}
        <button
          onClick={handleConsent}
          style={{
            width: "100%", height: 52, borderRadius: 16,
            background: "#F97316", border: "none", color: "#FFFFFF",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
            marginBottom: 10, fontFamily: "inherit",
          }}
        >
          Verstanden & Einwilligen ✓
        </button>
        <button
          onClick={handleDecline}
          style={{
            width: "100%", height: 44, borderRadius: 14,
            background: "#F3F4F6", border: "none", color: "#6B7280",
            fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
