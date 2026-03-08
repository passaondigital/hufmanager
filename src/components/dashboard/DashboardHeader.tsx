import { CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

interface DashboardHeaderProps {
  fullName?: string | null;
}

export function DashboardHeader({ fullName }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = fullName?.split(" ")[0];
  const isDemo = isDemoEmail(user?.email);
  const today = new Date();

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {format(today, "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
            {isDemo && <DemoBadge />}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/calendar")}
            className="gap-1.5 h-8 text-xs"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Termin</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/customers")}
            className="gap-1.5 h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pferd</span>
            <span className="sm:hidden">🐴</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
