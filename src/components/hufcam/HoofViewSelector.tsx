import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";

interface HoofViewSelectorProps {
  selectedView: HoofView | null;
  onViewSelect: (view: HoofView) => void;
  className?: string;
}

export function HoofViewSelector({ 
  selectedView, 
  onViewSelect, 
  className 
}: HoofViewSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-muted-foreground text-center font-medium">
        Welche Ansicht möchtest du fotografieren?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {HOOF_VIEW_CONFIGS.map((config) => (
          <button
            key={config.id}
            onClick={() => onViewSelect(config.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all min-w-[70px]",
              selectedView === config.id
                ? "border-primary bg-primary/10 text-primary shadow-md"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <span className="text-2xl">{config.icon}</span>
            <span className="text-xs font-medium">{config.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
