import { Clock, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SyncStatusBadgeProps {
  status: "pending" | "synced" | "error";
  className?: string;
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  if (status === "synced") {
    return null;
  }

  const config = {
    pending: {
      icon: Clock,
      label: "Wartet auf Sync",
      color: "text-amber-400",
    },
    error: {
      icon: AlertCircle,
      label: "Sync fehlgeschlagen",
      color: "text-destructive",
    },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", className)}>
          <Icon className={cn("h-4 w-4", color)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
