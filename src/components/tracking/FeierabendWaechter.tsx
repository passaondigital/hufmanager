import { useState, useEffect } from "react";
import { Moon, Sun, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BusinessHours {
  monday?: { start: string; end: string };
  tuesday?: { start: string; end: string };
  wednesday?: { start: string; end: string };
  thursday?: { start: string; end: string };
  friday?: { start: string; end: string };
  saturday?: { start: string; end: string };
  sunday?: { start: string; end: string };
}

const DAY_NAMES: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

const STORAGE_KEY = "huf_feierabend_active";

export function FeierabendWaechter() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [isOutsideHours, setIsOutsideHours] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [nextWorkStart, setNextWorkStart] = useState<string | null>(null);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setIsActive(true);
    }
  }, []);

  // Fetch business hours
  useEffect(() => {
    const fetchBusinessHours = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("business_hours")
        .eq("id", user.id)
        .single();

      if (!error && data?.business_hours) {
        setBusinessHours(data.business_hours as BusinessHours);
      }
    };

    fetchBusinessHours();
  }, [user]);

  // Check if currently outside business hours
  useEffect(() => {
    const checkHours = () => {
      if (!businessHours) {
        setIsOutsideHours(false);
        return;
      }

      const now = new Date();
      const dayIndex = now.getDay();
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDay = dayNames[dayIndex];
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      const todayHours = businessHours[currentDay as keyof BusinessHours];
      
      if (!todayHours) {
        // No business hours for today = outside hours
        setIsOutsideHours(true);
        findNextWorkStart(businessHours, now);
        return;
      }

      const isWithin = currentTime >= todayHours.start && currentTime <= todayHours.end;
      setIsOutsideHours(!isWithin);

      if (!isWithin) {
        findNextWorkStart(businessHours, now);
      }
    };

    checkHours();
    const interval = setInterval(checkHours, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [businessHours]);

  const findNextWorkStart = (hours: BusinessHours, now: Date) => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    
    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      const dayName = dayNames[checkDate.getDay()];
      const dayHours = hours[dayName as keyof BusinessHours];

      if (dayHours) {
        if (i === 0) {
          // Today
          const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
          if (currentTime < dayHours.start) {
            setNextWorkStart(`Heute um ${dayHours.start} Uhr`);
            return;
          }
        } else {
          setNextWorkStart(`${DAY_NAMES[dayName]} um ${dayHours.start} Uhr`);
          return;
        }
      }
    }
    setNextWorkStart(null);
  };

  const handleToggle = () => {
    const newState = !isActive;
    setIsActive(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));

    if (newState) {
      toast.success("Feierabend-Modus aktiviert", {
        description: "Neue Anfragen werden bis zu den nächsten Arbeitszeiten pausiert.",
        icon: <Moon className="h-5 w-5" />,
      });
    } else {
      toast.info("Feierabend-Modus deaktiviert", {
        description: "Du bist wieder für Anfragen erreichbar.",
        icon: <Sun className="h-5 w-5" />,
      });
    }
  };

  const isEffectivelyOffHours = isActive || isOutsideHours;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className={cn(
                "relative h-10 w-10 transition-all",
                isEffectivelyOffHours && "text-primary"
              )}
            >
              {isEffectivelyOffHours ? (
                <Moon className={cn(
                  "h-5 w-5",
                  isActive && "fill-primary"
                )} />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <div className="space-y-1">
              <p className="font-medium">
                {isActive ? "Feierabend-Modus aktiv" : "Feierabend-Modus"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isActive 
                  ? "Klicken um zu deaktivieren" 
                  : "Klicken um Anfragen zu pausieren"}
              </p>
              {isOutsideHours && !isActive && (
                <p className="text-xs text-orange-400">
                  Derzeit außerhalb der Arbeitszeiten
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Info Dialog when outside hours */}
      {isEffectivelyOffHours && (
        <Badge 
          variant="outline" 
          className={cn(
            "hidden md:flex items-center gap-1.5 cursor-pointer border-primary/30 hover:bg-primary/10",
            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
          )}
          onClick={() => setShowDialog(true)}
        >
          <Moon className="h-3 w-3" />
          <span className="text-xs">Feierabend</span>
        </Badge>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              Feierabend-Modus
            </DialogTitle>
            <DialogDescription>
              Schütze deine Freizeit und verhindere Burnout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isActive && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Manuell aktiviert</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Neue Anfragen werden in eine Warteschlange verschoben und morgen bearbeitet.
                  </p>
                </div>
              </div>
            )}

            {isOutsideHours && businessHours && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Du befindest dich derzeit außerhalb deiner definierten Arbeitszeiten.
                </p>
                {nextWorkStart && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Nächster Arbeitsbeginn: <strong>{nextWorkStart}</strong></span>
                  </div>
                )}
              </div>
            )}

            {!businessHours && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  Du hast noch keine Arbeitszeiten definiert. Gehe zu{" "}
                  <span className="text-primary font-medium">Management → Einstellungen</span>{" "}
                  um deine Geschäftszeiten festzulegen.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant={isActive ? "default" : "outline"}
                className="flex-1"
                onClick={handleToggle}
              >
                {isActive ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Deaktivieren
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Jetzt aktivieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook to check if Feierabend mode is active (for use in other components)
export function useFeierabendStatus() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      setIsActive(saved === "true");
    };

    checkStatus();
    window.addEventListener("storage", checkStatus);
    return () => window.removeEventListener("storage", checkStatus);
  }, []);

  return isActive;
}
