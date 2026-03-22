import { cn } from "@/lib/utils";
import type { HoofDetails, HoofDetailEntry } from "@/components/horse-detail/types";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface HoofGridZoneProps {
  hoofDetails?: HoofDetails | null;
  lastAppointmentDate?: string | null;
  role: Role;
  onHoofClick?: (hoofKey: string) => void;
}

const HOOVES = [
  { key: "vl", label: "Vorne links" },
  { key: "vr", label: "Vorne rechts" },
  { key: "hl", label: "Hinten links" },
  { key: "hr", label: "Hinten rechts" },
] as const;

export function HoofGridZone({ hoofDetails, lastAppointmentDate, role, onHoofClick }: HoofGridZoneProps) {
  const details = hoofDetails || {};
  const getHoof = (key: string): HoofDetailEntry | undefined => details[key as keyof HoofDetails];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Hufe</h3>
        <span className="text-xs text-primary cursor-pointer hover:underline">Details →</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {HOOVES.map(h => {
          const hoof = getHoof(h.key);
          const hasIssues = hoof?.issues && hoof.issues.length > 0;
          const isGood = hoof?.condition === "good";

          return (
            <button
              key={h.key}
              onClick={() => onHoofClick?.(h.key)}
              className={cn(
                "relative rounded-xl border p-3 text-center transition-all hover:shadow-md active:scale-[0.98]",
                hasIssues
                  ? "border-l-[3px] border-l-amber-500 border-t-border border-r-border border-b-border bg-amber-500/[0.03]"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <p className="text-xs text-muted-foreground">{h.label}</p>
              <p className={cn(
                "text-sm font-medium mt-1.5 flex items-center justify-center gap-1",
                isGood ? "text-green-600" : hasIssues ? "text-amber-600" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isGood ? "bg-green-500" : hasIssues ? "bg-amber-500" : "bg-muted-foreground/30"
                )} />
                {isGood ? "OK" : hasIssues ? "Befund" : "–"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {hasIssues
                  ? hoof!.issues!.slice(0, 2).join(", ")
                  : lastAppointmentDate
                  ? `Check ${new Date(lastAppointmentDate).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`
                  : "Kein Check"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
