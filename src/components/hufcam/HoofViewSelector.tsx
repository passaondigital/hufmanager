import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";

interface HoofViewSelectorProps {
  selectedView: HoofView | null;
  onViewSelect: (view: HoofView) => void;
  className?: string;
  compact?: boolean;
}

export function HoofViewSelector({
  selectedView,
  onViewSelect,
  className,
  compact = false
}: HoofViewSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <p className="text-sm text-muted-foreground text-center font-medium">
          Welche Ansicht möchtest du fotografieren?
        </p>
      )}
      <div className={cn(
        "flex flex-wrap justify-center gap-2",
        compact && "gap-1"
      )}>
        {HOOF_VIEW_CONFIGS.map((config) => (
          <button
            key={config.id}
            onClick={() => onViewSelect(config.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all",
              compact ? "p-2 min-w-[60px]" : "p-3 min-w-[70px]",
              selectedView === config.id
                ? "border-primary bg-primary/10 text-primary shadow-md"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <span className={compact ? "text-xl" : "text-2xl"}>{config.icon}</span>
            <span className={cn("font-medium", compact ? "text-[10px]" : "text-xs")}>{config.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
