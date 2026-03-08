import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Route } from "lucide-react";
import { format, addWeeks, parseISO, differenceInDays, isBefore, addDays } from "date-fns";

export function DueMapWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dueCount = 0 } = useQuery({
    queryKey: ["due-map-count", user?.id],
    queryFn: async () => {
      const now = new Date();
      const sevenDays = addDays(now, 7);

      const { data: horses } = await supabase
        .from("horses")
        .select("id, shoeing_interval")
        .is("deleted_at", null);

      if (!horses?.length) return 0;

      const { data: appointments } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .in("horse_id", horses.map(h => h.id))
        .eq("status", "completed")
        .order("date", { ascending: false });

      const lastByHorse: Record<string, string> = {};
      for (const a of appointments || []) {
        if (!lastByHorse[a.horse_id]) lastByHorse[a.horse_id] = a.date;
      }

      const { data: scheduled } = await supabase
        .from("appointments")
        .select("horse_id")
        .in("horse_id", horses.map(h => h.id))
        .in("status", ["scheduled", "planned"])
        .gte("date", format(now, "yyyy-MM-dd"));

      const scheduledSet = new Set((scheduled || []).map(a => a.horse_id));

      let count = 0;
      for (const horse of horses) {
        if (scheduledSet.has(horse.id)) continue;
        const interval = horse.shoeing_interval || 6;
        const last = lastByHorse[horse.id];
        if (!last) { count++; continue; }
        const nextDue = addWeeks(parseISO(last), interval);
        if (isBefore(nextDue, sevenDays)) count++;
      }
      return count;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fällige Termine
          </span>
        </div>
        {dueCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {dueCount} fällig
          </Badge>
        )}
      </div>
      <div className="relative h-[240px] bg-muted/30 flex items-center justify-center">
        {/* Placeholder for map - in production would use Leaflet */}
        <div className="text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-xs">
            {dueCount > 0
              ? `${dueCount} Pferde brauchen einen Termin`
              : "Alle Pferde sind versorgt"
            }
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-primary gap-1"
            onClick={() => navigate("/tages-cockpit")}
          >
            <Route className="h-3.5 w-3.5" />
            Route optimieren
          </Button>
        </div>
      </div>
    </div>
  );
}
