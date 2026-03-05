import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HelpTip } from "@/components/ui/HelpTip";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "muted";
  navigateTo?: string;
  helpTipId?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "primary",
  navigateTo,
  helpTipId,
}: StatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-card rounded-xl border border-border p-4 min-h-[100px]",
        navigateTo && "cursor-pointer hover:bg-muted/50 active:scale-[0.98] transition-transform"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight flex items-center gap-1">
            {title}
            {helpTipId && <HelpTip id={helpTipId} />}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs sm:text-sm font-medium",
                changeType === "positive" && "text-accent",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-2.5 rounded-lg",
            iconColor === "primary" && "bg-primary/10",
            iconColor === "accent" && "bg-accent/10",
            iconColor === "muted" && "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              iconColor === "primary" && "text-primary",
              iconColor === "accent" && "text-accent",
              iconColor === "muted" && "text-muted-foreground"
            )}
          />
        </div>
      </div>
    </div>
  );
}
