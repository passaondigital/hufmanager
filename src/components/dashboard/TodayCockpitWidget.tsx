import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TodayCockpitWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data } = useQuery({
    queryKey: ["today-cockpit", user?.id, todayStr],
    queryFn: async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, time, status, service_type, horses(name)")
        .eq("provider_id", user!.id)
        .eq("date", todayStr)
        .neq("status", "cancelled")
        .order("time", { ascending: true });

      const list = (appts || []).map((a: any) => ({
        id: a.id,
        time: a.time,
        status: a.status,
        horse_name: a.horses?.name || "–",
        service_type: a.service_type,
      }));

      const openCount = list.filter(a => a.status !== "completed").length;
      const plannedRevenue = 0; // Could calculate from prices

      return { appointments: list, openCount, total: list.length };
    },
    enabled: !!user?.id,
  });

  const appts = data?.appointments || [];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Heute</span>
          <span className="text-xs text-muted-foreground">
            {data?.total || 0} Termine · {data?.openCount || 0} offen
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {appts.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Keine Termine heute
          </div>
        ) : (
          appts.slice(0, 5).map((apt) => (
            <button
              key={apt.id}
              onClick={() => navigate("/calendar")}
              className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                {apt.time ? apt.time.slice(0, 5) : "–"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{apt.horse_name}</p>
                {apt.service_type && (
                  <p className="text-[11px] text-muted-foreground truncate">{apt.service_type}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  apt.status === "completed" ? "bg-emerald-500" :
                  apt.status === "overdue" ? "bg-destructive" :
                  "bg-primary"
                )} />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
