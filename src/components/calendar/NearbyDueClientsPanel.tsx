import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Clock, Users } from "lucide-react";
import { format, addWeeks, parseISO, differenceInDays, isBefore, addDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface NearbyDueClient {
  horseId: string;
  horseName: string;
  ownerName: string;
  locationName: string | null;
  postalCode: string | null;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface NearbyDueClientsPanelProps {
  selectedDate: Date | null;
  onSelectHorse: (horseId: string) => void;
}

export function NearbyDueClientsPanel({ selectedDate, onSelectHorse }: NearbyDueClientsPanelProps) {
  const { user } = useAuth();

  const { data: nearbyClients = [], isLoading } = useQuery({
    queryKey: ["nearby-due-clients", user?.id, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const now = new Date();
      const sevenDaysFromNow = addDays(now, 14); // Look further ahead for suggestions
      
      // Fetch horses with owner info and location
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select(`
          id, 
          name, 
          shoeing_interval, 
          location_name,
          owner:profiles!horses_owner_id_fkey (
            id,
            full_name,
            zip
          )
        `)
        .is("deleted_at", null);
      
      if (horsesError) throw horsesError;
      if (!horses || horses.length === 0) return [];

      // Fetch the last completed appointment for each horse
      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .in("horse_id", horses.map(h => h.id))
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (apptError) throw apptError;

      // Get the latest appointment per horse
      const lastAppointmentByHorse: Record<string, string> = {};
      for (const apt of appointments || []) {
        if (!lastAppointmentByHorse[apt.horse_id]) {
          lastAppointmentByHorse[apt.horse_id] = apt.date;
        }
      }

      // Check for already scheduled future appointments
      const { data: scheduledAppts } = await supabase
        .from("appointments")
        .select("horse_id")
        .in("horse_id", horses.map(h => h.id))
        .in("status", ["scheduled", "planned"])
        .gte("date", format(now, "yyyy-MM-dd"));

      const horsesWithScheduled = new Set((scheduledAppts || []).map(a => a.horse_id));

      // Group by postal code prefix (first 2 digits for region)
      const locationGroups: Record<string, NearbyDueClient[]> = {};
      
      for (const horse of horses) {
        // Skip if already has a scheduled appointment
        if (horsesWithScheduled.has(horse.id)) continue;

        const intervalWeeks = horse.shoeing_interval || 6;
        const lastDate = lastAppointmentByHorse[horse.id];
        
        let daysUntilDue = 0;
        let isOverdue = false;
        
        if (!lastDate) {
          isOverdue = true;
        } else {
          const lastAppointment = parseISO(lastDate);
          const nextDue = addWeeks(lastAppointment, intervalWeeks);
          daysUntilDue = differenceInDays(nextDue, now);
          isOverdue = daysUntilDue < 0;
          
          // Only include if due within 14 days or overdue
          if (!isBefore(nextDue, sevenDaysFromNow) && !isOverdue) continue;
        }

        const ownerData = horse.owner as any;
        const postalCode = ownerData?.zip || null;
        const locationKey = postalCode ? postalCode.substring(0, 2) : horse.location_name || "unknown";

        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = [];
        }

        locationGroups[locationKey].push({
          horseId: horse.id,
          horseName: horse.name,
          ownerName: ownerData?.full_name || "Unbekannt",
          locationName: horse.location_name,
          postalCode,
          daysUntilDue,
          isOverdue,
        });
      }

      // Find the most populated region
      let bestRegion: NearbyDueClient[] = [];
      for (const clients of Object.values(locationGroups)) {
        if (clients.length > bestRegion.length) {
          bestRegion = clients;
        }
      }

      // Sort by due date
      bestRegion.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.daysUntilDue - b.daysUntilDue;
      });

      return bestRegion.slice(0, 4);
    },
    enabled: !!user && !!selectedDate,
  });

  if (!selectedDate || isLoading) return null;

  if (nearbyClients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Keine weiteren fälligen Kunden in der Nähe gefunden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Kunden in der Nähe, die auch fällig sind
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {nearbyClients.map((client) => (
          <div
            key={client.horseId}
            className="flex items-center justify-between p-2 bg-background rounded-md border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  🐴 {client.horseName}
                </span>
                {client.isOverdue ? (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    Überfällig
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {client.daysUntilDue}d
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{client.ownerName}</span>
                {client.locationName && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {client.locationName}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onSelectHorse(client.horseId)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
