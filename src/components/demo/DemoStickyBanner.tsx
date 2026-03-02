import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Monitor, Gem } from "lucide-react";
import { PricingModal } from "@/components/subscription/PricingModal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { isDemoEmail } from "@/lib/demo-accounts";

export function DemoStickyBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  if (!isDemoEmail(user?.email)) {
    return null;
  }

  return (
    <>
      {!isDismissed ? (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-card",
          "border-t border-border"
        )}>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-8 w-8 rounded-md bg-muted items-center justify-center">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base text-foreground">
                    Demo-Modus
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Schau dich um – probier die App aus allen Perspektiven.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsPricingOpen(true)}
                  size="sm"
                >
                  Eigenen Account erstellen
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsPricingOpen(true)}
          className="fixed bottom-4 right-4 z-50 shadow-lg gap-2"
          size="sm"
        >
          <Gem className="h-4 w-4" />
          Upgrade
        </Button>
      )}

      <PricingModal
        open={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        title="Bereit für deinen eigenen HufManager?"
        description="Übernimm deine Daten aus der Demo und arbeite im eigenen Account."
        showTrialBadge={true}
        isDemoContext={true}
      />
    </>
  );
}
