import { useEffect, useState } from "react";
import { loadHufManagerStats, type HufManagerStats } from "@/lib/hufi-onboarding-detector";

interface Props {
  userId: string;
  onContinue: () => void;
}

const HUFI_LOGO = "https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png";

const NEW_FEATURES = [
  { icon: "🎙", label: "Sprachsteuerung", desc: "Hände dreckig? Einfach reden." },
  { icon: "⚙️", label: "Aufgaben-Automation", desc: "Mehrere Schritte auf einmal — z.B. alle überfälligen Kunden erinnern." },
  { icon: "🧠", label: "Hufi lernt dich kennen", desc: "Je öfter du arbeitest, desto besser kennt Hufi deinen Rhythmus." },
  { icon: "📍", label: "Routenoptimierung", desc: "Kürzeste Reihenfolge für deinen Arbeitstag — direkt in Maps." },
];

export function HufManagerWelcome({ userId, onContinue }: Props) {
  const [stats, setStats] = useState<HufManagerStats | null>(null);

  useEffect(() => {
    loadHufManagerStats(userId).then(setStats);
  }, [userId]);

  const firstName = stats?.fullName?.split(" ")[0] ?? "";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: "#FFFFFF",
        borderRadius: "28px 28px 0 0",
        padding: "28px 24px 40px",
        width: "100%", maxWidth: 430,
        overflowY: "auto", maxHeight: "92dvh",
        animation: "slideUpBanner 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <style>{`
          @keyframes slideUpBanner {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: "#F97316", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
          }}>
            <img src={HUFI_LOGO} alt="Hufi" style={{ width: "80%", height: "80%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", textAlign: "center", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
          {firstName ? `Willkommen zurück, ${firstName}!` : "Willkommen zurück!"}
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>
          Dein HufManager-Account ist vollständig übernommen.
        </p>

        {/* Daten-Stats */}
        {stats && (
          <div style={{
            background: "#F0FDF4", border: "1px solid #BBF7D0",
            borderRadius: 16, padding: "16px 18px", marginBottom: 20,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          }}>
            <Stat icon="👥" value={stats.clientCount} label="Kunden" />
            <Stat icon="🐴" value={stats.horseCount} label="Pferde" />
            <Stat icon="📅" value={stats.appointmentCount} label="Termine ab heute" />
            <Stat icon="🧾" value={stats.invoiceCount} label="Rechnungen" />
          </div>
        )}

        {/* Was neu ist */}
        <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Was neu in Hufi ist
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {NEW_FEATURES.map((f) => (
            <div key={f.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          style={{
            width: "100%", height: 52, borderRadius: 16,
            background: "#F97316", border: "none",
            color: "#FFFFFF", fontSize: 16, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
            letterSpacing: "-0.2px",
          }}
        >
          Los geht's →
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#166534", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "#4B7C5A" }}>{label}</div>
      </div>
    </div>
  );
}
