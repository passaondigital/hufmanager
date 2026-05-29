import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, ArrowRight } from "lucide-react";
import { PricingModal } from "@/components/subscription/PricingModal";
import { useAuth } from "@/hooks/useAuth";
import { isProviderDemoEmail } from "@/lib/demo-accounts";

export function DemoCalendarEntry() {
  const { user } = useAuth();
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Only show for provider demo account
  if (!isProviderDemoEmail(user?.email)) {
    return null;
  }

  return (
    <>
      <Card
        className="cursor-pointer border-dashed hover:bg-muted/50"
        onClick={() => setIsPricingOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Monitor className="h-3 w-3" />
                Demo-Modus
              </Badge>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">
                Kopf frei? Dann jetzt mit deinem eigenen Account starten.
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Übernimm deine Daten und arbeite in deinem eigenen Hufi.
              </p>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>

      <PricingModal
        open={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        title="Bereit für deinen eigenen Hufi?"
        description="Übernimm deine Daten aus der Demo und arbeite im eigenen Account."
        showTrialBadge={true}
        isDemoContext={true}
      />
    </>
  );
}
