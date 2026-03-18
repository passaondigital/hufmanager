import type { HoofDetails, HoofDetailEntry } from "@/components/horse-detail/types";

interface HoofGridProps {
  hoofDetails?: HoofDetails | null;
  lastAppointmentDate?: string | null;
}

const HOOVES = [
  { key: "vl", label: "Vorne links" },
  { key: "vr", label: "Vorne rechts" },
  { key: "hl", label: "Hinten links" },
  { key: "hr", label: "Hinten rechts" },
] as const;

export function HoofGrid({ hoofDetails, lastAppointmentDate }: HoofGridProps) {
  const details = hoofDetails || {};

  const getHoof = (key: string): HoofDetailEntry | undefined =>
    details[key as keyof HoofDetails];

  return (
    <div className="px-4">
      <div className="hp-section-header">
        <span className="hp-section-title">Hufe</span>
        <span className="hp-section-link">Details →</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {HOOVES.map((h) => {
          const hoof = getHoof(h.key);
          const hasIssues = hoof?.issues && hoof.issues.length > 0;
          const isGood = hoof?.condition === "good";
          const statusColor = isGood ? "var(--hp-green)" : hasIssues ? "var(--hp-yellow)" : "var(--hp-text3)";
          const statusLabel = isGood ? "OK" : hasIssues ? "Befund" : "–";

          return (
            <div
              key={h.key}
              className={`hp-hoof-card ${hasIssues ? "has-issue" : ""}`}
            >
              <p className="text-[12px] text-[var(--hp-text3)]">{h.label}</p>
              <p
                className="text-[13px] font-medium mt-1.5 flex items-center justify-center gap-1"
                style={{ color: statusColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {statusLabel}
              </p>
              <p className="text-[10px] text-[var(--hp-text3)] mt-1.5">
                {hasIssues
                  ? hoof!.issues!.slice(0, 2).join(", ")
                  : lastAppointmentDate
                  ? `Check ${new Date(lastAppointmentDate).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`
                  : "Kein Check"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
