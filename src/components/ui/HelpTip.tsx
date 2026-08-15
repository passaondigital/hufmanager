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
  id?: string;
  /** Direkter Hilfetitel fuer neue Slim-/Kontext-Hilfen. */
  title?: string;
  /** Direkte Kurzbeschreibung. Maximal 1–3 einfache Saetze empfohlen. */
  description?: string;
  className?: string;
}

/**
 * Universelles Hilfe-Icon fuer den gesamten HufManager.
 * Desktop: Hover -> Tooltip
 * Mobile: Tap -> Bottom-Sheet (Drawer)
 *
 * Bestehende Aufrufe koennen weiterhin `id` aus helpTexts verwenden.
 * Neue kontextuelle Hilfen duerfen title/description direkt uebergeben.
 */
export function HelpTip({ id, title: directTitle, description: directDescription, className }: HelpTipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  let title = directTitle ?? "Hilfe";
  let description = directDescription ?? "Hier findest du eine kurze Erklaerung zu diesem Bereich.";

  if (id && (!directTitle || !directDescription)) {
    const [section, field] = id.split(".");
    const help = getHelpText(section, field);
    title = directTitle ?? help.title;
    description = directDescription ?? help.description;
  }

  const icon = (
    <HelpCircle
      className={`inline-block h-4 w-4 text-[#F5970A] opacity-70 hover:opacity-100 transition-opacity cursor-help shrink-0 ${className ?? ""}`}
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
          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full p-1 hover:bg-orange-500/10"
          aria-label={`Info: ${title}`}
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
              <DrawerDescription className="mt-1 text-sm leading-relaxed">
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
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full p-1 hover:bg-orange-500/10"
            aria-label={`Info: ${title}`}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="mb-0.5 text-sm font-medium">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
