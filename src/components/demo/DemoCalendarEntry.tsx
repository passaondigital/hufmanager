import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, ArrowRight } from "lucide-react";
import { PricingModal } from "@/components/subscription/PricingModal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const DEMO_EMAIL = "hufbearbeiter.hufmanager@gmail.com";

export function DemoCalendarEntry() {
  const { user } = useAuth();
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Only show for demo account
  if (user?.email !== DEMO_EMAIL) {
    return null;
  }

  const today = new Date();
  const formattedDate = format(today, "EEEE, d. MMMM", { locale: de });

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
          "border-2 border-dashed border-primary/50 bg-primary/5",
          "hover:border-primary hover:shadow-lg hover:shadow-primary/20"
        )}
        onClick={() => setIsPricingOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Time Column */}
            <div className="flex flex-col items-center text-center min-w-[60px]">
              <div className="flex items-center gap-1 text-primary font-semibold">
                <Clock className="h-3.5 w-3.5" />
                <span>08:00</span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {formattedDate}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Demo-Termin
                </Badge>
              </div>
              <h4 className="font-semibold text-foreground truncate">
                🎉 Starte mit deinem eigenen Account!
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Klicke hier, um dein Paket zu wählen und 14 Tage kostenlos zu testen.
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center self-center">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

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
