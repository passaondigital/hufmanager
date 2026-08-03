import { AlertCircle } from "lucide-react";
import type { MockInvoice } from "./HufiAssistantState";

interface HufiInvoicePreviewProps {
  data: MockInvoice;
}

const ROWS: { key: keyof Omit<MockInvoice, "hint">; label: string }[] = [
  { key: "customer", label: "Kunde" },
  { key: "horse", label: "Pferd" },
  { key: "service", label: "Leistung" },
  { key: "amount", label: "Betrag" },
  { key: "date", label: "Datum" },
  { key: "paymentTerm", label: "Zahlungsziel" },
];

export function HufiInvoicePreview({ data }: HufiInvoicePreviewProps) {
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
          <span
            style={{
              fontSize: 13,
              color: key === "amount" ? "var(--hufi-orange)" : "#F5EFE6",
              fontWeight: 700,
              textAlign: "right",
            }}
          >
            {data[key]}
          </span>
        </div>
      ))}
      {data.hint && (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <AlertCircle size={13} style={{ marginTop: 1, color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(245,239,230,0.65)" }}>{data.hint}</span>
        </div>
      )}
    </div>
  );
}
