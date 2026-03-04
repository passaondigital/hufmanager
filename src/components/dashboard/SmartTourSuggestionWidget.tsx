import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route, ChevronRight, Sparkles, Calendar, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, parseISO, differenceInDays, isBefore, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

interface DueHorse {
  id: string;
  name: string;
  readable_id: string | null;
  owner_id: string;
  shoeing_interval: number;
  location_name: string | null;
  last_appointment_date: string | null;
  next_due_date: Date;
  days_until_due: number;
  is_overdue: boolean;
  zip_code?: string;
  city?: string;
}

interface PLZGroup {
  plz_prefix: string;
  city: string;
  horses: DueHorse[];
  total_overdue: number;
}

export function SmartTourSuggestionWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: dueHorses = [], isLoading } = useQuery({
    queryKey: ["smart-tour-suggestions", user?.id],
    queryFn: async () => {
      const now = new Date();
      const fourteenDays = addDays(now, 14);
      
      // Fetch horses with location info
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id, name, readable_id, owner_id, shoeing_interval, location_name")
        .is("deleted_at", null);
      
      if (horsesError || !horses) return [];

      // Fetch last completed appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .in("horse_id", horses.map(h => h.id))
        .eq("status", "completed")
        .order("date", { ascending: false });

      const lastAppointmentByHorse: Record<string, string> = {};
      for (const apt of appointments || []) {
        if (!lastAppointmentByHorse[apt.horse_id]) {
          lastAppointmentByHorse[apt.horse_id] = apt.date;
        }
      }

      // Check for already scheduled
      const { data: scheduledAppts } = await supabase
        .from("appointments")
        .select("horse_id")
        .in("horse_id", horses.map(h => h.id))
        .in("status", ["scheduled", "planned"])
        .gte("date", format(now, "yyyy-MM-dd"));

      const horsesWithScheduled = new Set((scheduledAppts || []).map(a => a.horse_id));

      // Fetch owner contacts for PLZ grouping
      const ownerIds = [...new Set(horses.map(h => h.owner_id).filter(Boolean))];
      const { data: contacts } = ownerIds.length > 0 
        ? await supabase
            .from("contacts")
            .select("profile_id, zip_code, city")
            .eq("provider_id", user!.id)
            .in("profile_id", ownerIds)
        : { data: [] };

      const contactMap = new Map((contacts || []).map(c => [c.profile_id, c]));

      const dueList: DueHorse[] = [];
      
      for (const horse of horses) {
        if (horsesWithScheduled.has(horse.id)) continue;

        const intervalWeeks = horse.shoeing_interval || 6;
        const lastDate = lastAppointmentByHorse[horse.id];
        const contact = horse.owner_id ? contactMap.get(horse.owner_id) : null;
        
        if (!lastDate) {
          dueList.push({
            ...horse,
            shoeing_interval: intervalWeeks,
            last_appointment_date: null,
            next_due_date: now,
            days_until_due: 0,
            is_overdue: true,
            zip_code: contact?.zip_code || undefined,
            city: contact?.city || undefined,
          });
          continue;
        }

        const lastAppointment = parseISO(lastDate);
        const nextDue = addWeeks(lastAppointment, intervalWeeks);
        const daysUntilDue = differenceInDays(nextDue, now);
        
        if (isBefore(nextDue, fourteenDays)) {
          dueList.push({
            ...horse,
            shoeing_interval: intervalWeeks,
            last_appointment_date: lastDate,
            next_due_date: nextDue,
            days_until_due: daysUntilDue,
            is_overdue: daysUntilDue < 0,
            zip_code: contact?.zip_code || undefined,
            city: contact?.city || undefined,
          });
        }
      }

      return dueList;
    },
    enabled: !!user?.id,
  });

  // Group by PLZ prefix (first 2 digits)
  const plzGroups: PLZGroup[] = useMemo(() => {
    const groups = new Map<string, PLZGroup>();
    
    for (const horse of dueHorses) {
      // Skip horses with unknown/empty PLZ
      if (!horse.zip_code || horse.zip_code.trim() === "") continue;
      const prefix = horse.zip_code.slice(0, 2);
      const existing = groups.get(prefix);
      
      if (existing) {
        existing.horses.push(horse);
        if (horse.is_overdue) existing.total_overdue++;
      } else {
        groups.set(prefix, {
          plz_prefix: prefix,
          city: horse.city || horse.location_name || "Unbekannt",
          horses: [horse],
          total_overdue: horse.is_overdue ? 1 : 0,
        });
      }
    }
    
    // Sort by number of horses (most first), then overdue
    return Array.from(groups.values())
      .sort((a, b) => {
        if (a.total_overdue !== b.total_overdue) return b.total_overdue - a.total_overdue;
        return b.horses.length - a.horses.length;
      })
      .slice(0, 4);
  }, [dueHorses]);

  const handleCreateTour = (group: PLZGroup) => {
    // Navigate to calendar with pre-selected horses
    const horseIds = group.horses.map(h => h.id).join(",");
    navigate(`/kalender?suggestTour=${horseIds}&area=${group.plz_prefix}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Smarte Tour-Vorschläge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (plzGroups.length === 0) {
    return null; // Don't show widget if no suggestions
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smarte Tour-Vorschläge
          <Badge variant="secondary" className="ml-auto">
            {dueHorses.length} fällig
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Fällige Termine nach PLZ-Gebiet gruppiert — erstelle mit einem Klick eine optimierte Tour.
        </p>
        
        {plzGroups.map((group) => (
          <div
            key={group.plz_prefix}
            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">PLZ {group.plz_prefix}xxx</span>
                  {group.total_overdue > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      {group.total_overdue} überfällig
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {group.city} • 🐴 {group.horses.length} Pferd{group.horses.length !== 1 ? "e" : ""}
                </div>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="default"
              onClick={() => handleCreateTour(group)}
              className="gap-1.5 shrink-0 ml-2 min-h-[44px]"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Tour planen</span>
              <span className="sm:hidden">Plan</span>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
