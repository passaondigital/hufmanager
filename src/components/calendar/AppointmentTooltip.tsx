import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle2, UserPlus, Tags } from "lucide-react";
import { getPriceGroupShortLabel } from "@/lib/priceGroups";

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
    price_group_applied?: string | null;
    horses?: {
      name: string;
      breed: string | null;
    } | null;
  };
  onAssign?: (appointmentId: string) => void;
}

export function AppointmentTooltip({ children, appointment, onAssign }: AppointmentTooltipProps) {
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
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {appointment.service_type}
              </Badge>
              {appointment.price_group_applied && (
                <Badge variant="secondary" className="text-[10px] font-bold">
                  <Tags className="h-2.5 w-2.5 mr-0.5" />
                  {getPriceGroupShortLabel(appointment.price_group_applied)}
                </Badge>
              )}
            </div>
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

          {onAssign && (
            <div className="border-t border-border pt-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign(appointment.id);
                }}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Mitarbeiter zuweisen
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
