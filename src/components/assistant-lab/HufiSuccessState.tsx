import { CheckCircle2 } from "lucide-react";

interface HufiSuccessStateProps {
  text: string;
}

// Der eigentliche "Erfolgs-Moment" ist der einmalige Lichtimpuls des Orbs
// (siehe hufi-lab.css, [data-state="success"]) — diese Komponente liefert
// nur die dazugehörige, ruhige Textbestätigung.
export function HufiSuccessState({ text }: HufiSuccessStateProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
      <CheckCircle2 size={16} style={{ color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 650, color: "#F5EFE6" }}>{text}</p>
    </div>
  );
}
