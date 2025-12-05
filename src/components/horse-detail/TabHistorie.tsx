import { Appointment } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle2, Circle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TabHistorieProps {
  appointments: Appointment[];
}

export function TabHistorie({ appointments }: TabHistorieProps) {
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'Erledigt';
      case 'cancelled':
        return 'Abgesagt';
      case 'scheduled':
        return 'Geplant';
      default:
        return status || 'Unbekannt';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Terminhistorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {appointments.map((apt, index) => (
                  <div key={apt.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      apt.status === 'completed' ? "bg-green-500/10" : "bg-muted"
                    )}>
                      {getStatusIcon(apt.status)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(apt.date), "dd. MMMM yyyy", { locale: de })}
                          </p>
                          {apt.time && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {apt.time.slice(0, 5)} Uhr
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          apt.status === 'completed' && "bg-green-500/10 text-green-500",
                          apt.status === 'cancelled' && "bg-destructive/10 text-destructive",
                          apt.status === 'scheduled' && "bg-primary/10 text-primary"
                        )}>
                          {getStatusLabel(apt.status)}
                        </span>
                      </div>
                      
                      {apt.service_type && (
                        <p className="text-sm text-foreground mt-1">
                          {apt.service_type}
                        </p>
                      )}
                      
                      {apt.notes && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                          {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Noch keine Termine vorhanden
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
