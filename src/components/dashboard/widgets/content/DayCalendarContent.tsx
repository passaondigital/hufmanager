import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { WidgetContentProps } from "./types";

export default function DayCalendarContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateStr = format(currentDate, "yyyy-MM-dd");

  const { data: appointments = [] } = useQuery({
    queryKey: ["widget-day-cal", user?.id, dateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, horses(name)")
        .eq("provider_id", user!.id)
        .eq("date", dateStr)
        .neq("status", "cancelled")
        .order("time", { ascending: true });

      return (data || []).map((a: any) => ({
        id: a.id, time: a.time, status: a.status,
        horse_name: a.horses?.name || "–", service_type: a.service_type,
      }));
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
      case "overdue": return "bg-destructive/20 text-destructive";
      default: return "bg-primary/15 text-primary";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {format(currentDate, "EEEE, d. MMM", { locale: de })}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setCurrentDate(new Date())}>
            Heute
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Keine Termine</p>
      ) : (
        <div className="space-y-1.5">
          {appointments.map((apt) => (
            <button
              key={apt.id}
              onClick={() => navigate("/calendar")}
              className={cn(
                "w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-3",
                getStatusColor(apt.status)
              )}
            >
              <span className="text-xs font-mono opacity-70 w-10 shrink-0">
                {apt.time?.slice(0, 5) || "–"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{apt.horse_name}</p>
                {apt.service_type && <p className="text-[10px] opacity-70">{apt.service_type}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
