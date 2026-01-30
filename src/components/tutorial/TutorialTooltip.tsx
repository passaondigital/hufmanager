import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface TutorialTooltipProps {
  id: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  variant?: "icon" | "inline";
}

/**
 * Mini-Tutorial Tooltip component that shows helpful hints.
 * Can be toggled globally in Management settings.
 */
export function TutorialTooltip({
  id,
  title,
  description,
  children,
  side = "top",
  variant = "icon",
}: TutorialTooltipProps) {
  const [tutorialsEnabled] = useLocalStorage("tutorials_enabled", true);
  const [dismissedTutorials, setDismissedTutorials] = useLocalStorage<string[]>(
    "dismissed_tutorials",
    []
  );
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if tutorials are disabled or this specific one is dismissed
  if (!tutorialsEnabled || dismissedTutorials.includes(id)) {
    return children ? <>{children}</> : null;
  }

  const handleDismiss = () => {
    setDismissedTutorials([...dismissedTutorials, id]);
    setIsOpen(false);
  };

  if (variant === "inline" && children) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span className="relative inline-flex items-center">
            {children}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </span>
        </PopoverTrigger>
        <PopoverContent side={side} className="w-72 p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {title}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleDismiss}
            >
              Verstanden
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-primary"
          >
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
