import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { PricingModal } from "@/components/subscription/PricingModal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const DEMO_EMAIL = "hufbearbeiter.hufmanager@gmail.com";

export function DemoStickyBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Only show for demo account
  if (user?.email !== DEMO_EMAIL || isDismissed) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-primary",
        "border-t border-primary/20 shadow-lg shadow-primary/20"
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-10 w-10 rounded-full bg-white/20 items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="font-semibold text-sm sm:text-base">
                  Du nutzt den Demo-Account
                </p>
                <p className="text-xs sm:text-sm text-white/80">
                  Erstelle jetzt deinen eigenen Account und starte 14 Tage kostenlos!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsPricingOpen(true)}
                className="bg-white text-primary hover:bg-white/90 font-semibold whitespace-nowrap"
                size="sm"
              >
                Eigenen Account erstellen
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PricingModal
        open={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        title="Wähle dein Paket & starte 14 Tage kostenlos!"
        description="Erstelle deinen eigenen HufManager Account und digitalisiere dein Business."
        showTrialBadge={true}
      />
    </>
  );
}
