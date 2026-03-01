import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CalendarPlus } from "lucide-react";
import { differenceInDays, addWeeks, parseISO, format } from "date-fns";
import { de } from "date-fns/locale";

interface HorseInterval {
  id: string;
  name: string;
  photo_url: string | null;
  shoeing_interval: number;
  next_due_date: Date;
  days_until_due: number;
  is_overdue: boolean;
  weeks_since_last: number;
}

export function HorseIntervalReminderWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [horses, setHorses] = useState<HorseInterval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        const { data: myHorses } = await supabase
          .from("horses")
          .select("id, name, photo_url, shoeing_interval")
          .eq("owner_id", user.id)
          .is("deleted_at", null);

        if (!myHorses || myHorses.length === 0) {
          setLoading(false);
          return;
        }

        const horseIds = myHorses.map((h) => h.id);
        const { data: appointments } = await supabase
          .from("appointments")
          .select("horse_id, date")
          .in("horse_id", horseIds)
          .eq("status", "completed")
          .order("date", { ascending: false });

        const lastByHorse: Record<string, string> = {};
        appointments?.forEach((a) => {
          if (!lastByHorse[a.horse_id]) lastByHorse[a.horse_id] = a.date;
        });

        const now = new Date();
        const result: HorseInterval[] = [];

        for (const horse of myHorses) {
          const interval = horse.shoeing_interval || 6;
          const lastDate = lastByHorse[horse.id];
          if (!lastDate) continue;

          const nextDue = addWeeks(parseISO(lastDate), interval);
          const daysUntilDue = differenceInDays(nextDue, now);
          const weeksSinceLast = Math.floor(differenceInDays(now, parseISO(lastDate)) / 7);

          // Show if due within 21 days or overdue (expanded from 14)
          if (daysUntilDue <= 21) {
            result.push({
              id: horse.id,
              name: horse.name,
              photo_url: horse.photo_url,
              shoeing_interval: interval,
              next_due_date: nextDue,
              days_until_due: daysUntilDue,
              is_overdue: daysUntilDue < 0,
              weeks_since_last: weeksSinceLast,
            });
          }
        }

        result.sort((a, b) => a.days_until_due - b.days_until_due);
        setHorses(result);
      } catch (err) {
        console.error("Error fetching intervals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (loading || horses.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Nächste Termine fällig</span>
        </div>
        <div className="space-y-2">
          {horses.map((horse) => (
            <div key={horse.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/60">
              {horse.photo_url ? (
                <img src={horse.photo_url} alt={horse.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">🐴</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{horse.name}</p>
                <p className="text-xs text-muted-foreground">
                  {horse.weeks_since_last} Wochen seit letztem Termin · Fällig {format(horse.next_due_date, "dd. MMM", { locale: de })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {horse.is_overdue ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {Math.abs(horse.days_until_due)}d überfällig
                  </Badge>
                ) : horse.days_until_due <= 3 ? (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">
                    In {horse.days_until_due} Tagen
                  </Badge>
                ) : horse.days_until_due <= 7 ? (
                  <Badge className="bg-amber-500/5 text-amber-500 border-amber-100 text-[10px]">
                    In {horse.days_until_due} Tagen
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    In {horse.days_until_due} Tagen
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 gap-2 text-primary border-primary/30 hover:bg-primary/10"
          onClick={() => navigate("/client-booking")}
        >
          <CalendarPlus className="h-4 w-4" />
          Jetzt Termin anfragen
        </Button>
      </CardContent>
    </Card>
  );
}
