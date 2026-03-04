import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";
import { useTour } from "@/components/tour/TourContext";

/**
 * "Geführte Tour starten" Button – nur für Demo-Accounts sichtbar.
 * Opens the demo welcome modal with topic selection.
 */
export function DemoTourButton() {
  const { user } = useAuth();
  const { openDemoWelcome } = useTour();

  if (!isDemoEmail(user?.email)) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openDemoWelcome()}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <Compass className="h-4 w-4" />
      Tour wiederholen
    </Button>
  );
}
