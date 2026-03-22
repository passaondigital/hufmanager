import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ActionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  variant?: "danger";
  onClick: () => void;
}

interface QuickActionBarProps {
  actions: ActionDef[];
}

export function QuickActionBar({ actions }: QuickActionBarProps) {
  return (
    <div className="flex gap-2">
      {actions.map(a => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={a.onClick}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 min-h-[44px]",
              a.primary
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : a.variant === "danger"
                ? "bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15"
                : "bg-muted border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
