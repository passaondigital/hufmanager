import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  title?: string;
  content: string;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

/**
 * ℹ️ Mini info tooltip used throughout the Pferdeakte and other areas.
 * Provides contextual help via a small ? icon that opens a popover.
 */
export function InfoTooltip({ title, content, size = "sm", className }: InfoTooltipProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnSize = size === "sm" ? "w-[16px] h-[16px]" : "w-[20px] h-[20px]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors shrink-0",
            btnSize,
            className
          )}
          aria-label="Info"
        >
          <HelpCircle className={cn(iconSize, "text-muted-foreground")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3" side="top" align="start">
        {title && <p className="font-semibold text-sm mb-1 text-foreground">{title}</p>}
        <p className="text-[13px] text-muted-foreground leading-relaxed">{content}</p>
      </PopoverContent>
    </Popover>
  );
}
