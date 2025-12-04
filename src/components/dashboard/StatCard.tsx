import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "muted";
  navigateTo?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "primary",
  navigateTo,
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
        "bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow duration-300 animate-fade-in",
        navigateTo && "cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
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
            "p-3 rounded-xl",
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
