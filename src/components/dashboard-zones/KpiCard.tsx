import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KpiCardProps {
  icon: string | LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  warning?: boolean;
  onClick?: () => void;
  navigateTo?: string;
}

export function KpiCard({ icon, label, value, sub, highlight, warning, onClick, navigateTo }: KpiCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) onClick();
    else if (navigateTo) navigate(navigateTo);
  };
  const isClickable = !!(onClick || navigateTo);
  const IconComponent = typeof icon !== "string" ? icon : null;

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-all w-full",
        isClickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        !isClickable && "cursor-default",
        highlight && "border-primary/20 bg-gradient-to-br from-primary/[0.06] to-muted",
        warning && "border-destructive/30",
        !highlight && !warning && "border-border bg-muted"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {typeof icon === "string" ? (
          <span className="text-sm">{icon}</span>
        ) : IconComponent ? (
          <IconComponent className="h-3.5 w-3.5 text-primary" />
        ) : null}
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn(
        "text-lg font-semibold",
        warning ? "text-destructive" : "text-foreground"
      )}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </button>
  );
}
