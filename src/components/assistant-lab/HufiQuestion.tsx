import { HelpCircle } from "lucide-react";

interface HufiQuestionProps {
  text: string;
}

export function HufiQuestion({ text }: HufiQuestionProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
      <HelpCircle size={15} style={{ color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "#F5EFE6", letterSpacing: "-0.01em" }}>{text}</p>
    </div>
  );
}
