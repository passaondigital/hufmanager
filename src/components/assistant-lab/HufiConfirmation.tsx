interface HufiConfirmationButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
}

interface HufiConfirmationProps {
  buttons: HufiConfirmationButton[];
}

export function HufiConfirmation({ buttons }: HufiConfirmationProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
      {buttons.map(({ label, onClick, variant = "ghost" }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`hlab-focusable ${variant === "primary" ? "hufi-btn-primary" : "hufi-btn-ghost"}`}
          style={{ minHeight: 44, padding: "10px 20px", fontSize: 13.5, flex: buttons.length === 1 ? "1 1 auto" : undefined }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
