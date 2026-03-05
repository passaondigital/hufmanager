import { HelpCircle } from "lucide-react";
import { getHelpText } from "@/constants/helpTexts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface HelpTipProps {
  /** Format: "sektion.feld" z.B. "dashboard.aktive-kunden" */
  id: string;
  className?: string;
}

/**
 * Universelles Hilfe-Icon (?) für den gesamten HufManager.
 * Desktop: Hover → Tooltip
 * Mobile: Tap → Bottom-Sheet (Drawer)
 */
export function HelpTip({ id, className }: HelpTipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const [section, field] = id.split(".");
  const { title, description } = getHelpText(section, field);

  const icon = (
    <HelpCircle
      className={`inline-block h-3.5 w-3.5 text-[#F5970A] opacity-60 hover:opacity-100 transition-opacity cursor-help shrink-0 ${className ?? ""}`}
    />
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex items-center justify-center p-0.5 -m-0.5"
          aria-label={`Hilfe: ${title}`}
        >
          {icon}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-5 w-5 text-[#F5970A]" />
                {title}
              </DrawerTitle>
              <DrawerDescription className="text-sm leading-relaxed mt-1">
                {description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Verstanden
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center" aria-label={`Hilfe: ${title}`}>
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium text-sm mb-0.5">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
