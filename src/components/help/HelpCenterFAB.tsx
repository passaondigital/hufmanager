import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpCenterModal } from "./HelpCenterModal";
import { cn } from "@/lib/utils";

interface HelpCenterFABProps {
  currentRoute?: string;
}

export function HelpCenterFAB({ currentRoute }: HelpCenterFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-transform hover:scale-110 active:scale-95"
        )}
        aria-label="Hilfe öffnen"
      >
        <LifeBuoy className="h-6 w-6" />
      </Button>

      <HelpCenterModal 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        currentRoute={currentRoute}
      />
    </>
  );
}
