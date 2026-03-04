import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";
import { useTour } from "@/components/tour/TourContext";

interface DemoTourButtonProps {
  tourName: "dashboard" | "partner" | "employee" | "client";
}

/**
 * "Geführte Tour starten" Button – nur für Demo-Accounts sichtbar.
 */
export function DemoTourButton({ tourName }: DemoTourButtonProps) {
  const { user } = useAuth();
  const { startTour } = useTour();

  if (!isDemoEmail(user?.email)) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTour(tourName)}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <Compass className="h-4 w-4" />
      Geführte Tour
    </Button>
  );
}
