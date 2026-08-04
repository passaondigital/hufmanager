interface HufiTranscriptProps {
  text: string;
  active?: boolean;
  label?: string;
}

export function HufiTranscript({ text, active, label = "Du sagst" }: HufiTranscriptProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "center" }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(245,239,230,0.4)",
        }}
      >
        {label}
      </span>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#F5EFE6", fontWeight: 550 }}>
        {text}
        {active && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 2,
              height: 14,
              marginLeft: 3,
              verticalAlign: "-2px",
              background: "var(--hufi-orange)",
              animation: "hlab-caret-blink 1s step-end infinite",
            }}
          />
        )}
      </p>
    </div>
  );
}
