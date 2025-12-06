import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";

interface AppointmentTooltipProps {
  children: React.ReactNode;
  appointment: {
    id: string;
    time: string | null;
    duration: number | null;
    service_type: string | null;
    location: string | null;
    status: string | null;
    is_confirmed_by_client: boolean | null;
    notes: string | null;
    horses?: {
      name: string;
      breed: string | null;
    } | null;
  };
}

export function AppointmentTooltip({ children, appointment }: AppointmentTooltipProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72" side="right" align="start">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-foreground">
                🐴 {appointment.horses?.name || "Unbekannt"}
              </h4>
              {appointment.horses?.breed && (
                <p className="text-xs text-muted-foreground">{appointment.horses.breed}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {appointment.service_type}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {appointment.time} ({appointment.duration || 60} Min.)
            </span>
          </div>

          {appointment.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}

          {appointment.is_confirmed_by_client && (
            <div className="flex items-center gap-1 text-sm text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              <span>Vom Kunden bestätigt</span>
            </div>
          )}

          {appointment.notes && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
              {appointment.notes.length > 100 
                ? `${appointment.notes.substring(0, 100)}...` 
                : appointment.notes}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
