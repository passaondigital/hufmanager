import type { MockObservation } from "./HufiAssistantState";

interface HufiObservationPreviewProps {
  data: MockObservation;
}

const ROWS: { key: keyof MockObservation; label: string }[] = [
  { key: "horse", label: "Pferd" },
  { key: "area", label: "Bereich" },
  { key: "observation", label: "Beobachtung" },
  { key: "date", label: "Datum" },
];

export function HufiObservationPreview({ data }: HufiObservationPreviewProps) {
  return (
    <div className="hlab-card" style={{ gap: 0 }}>
      {ROWS.map(({ key, label }, i) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "7px 0",
            borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
          }}
        >
          <span style={{ fontSize: 11.5, color: "rgba(245,239,230,0.45)", fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 13, color: "#F5EFE6", fontWeight: 600, textAlign: "right" }}>{data[key]}</span>
        </div>
      ))}
    </div>
  );
}
