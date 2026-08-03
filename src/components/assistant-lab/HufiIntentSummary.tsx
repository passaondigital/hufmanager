import { BrainCircuit } from "lucide-react";
import type { HufiIntent } from "./HufiAssistantState";

interface HufiIntentSummaryProps {
  intent: HufiIntent;
}

// Zeigt, dass Hufi mehr als nur Text verstanden hat — als menschlich lesbare
// Struktur (Label/Wert-Paare), bewusst kein Entwickler-JSON. Erscheint in der
// "understanding"-Phase, vor der eigentlichen Bestätigungsvorschau.
export function HufiIntentSummary({ intent }: HufiIntentSummaryProps) {
  return (
    <div className="hlab-card" style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <BrainCircuit size={13} style={{ color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,239,230,0.45)" }}>
          Erkannt
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#F5EFE6", letterSpacing: "-0.01em" }}>{intent.label}</p>
      {intent.entities.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
          {intent.entities.map((entity, i) => (
            <div
              key={entity.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 0",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(245,239,230,0.4)", fontWeight: 600 }}>{entity.label}</span>
              <span style={{ fontSize: 12.5, color: "#F5EFE6", fontWeight: 600, textAlign: "right" }}>{entity.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
