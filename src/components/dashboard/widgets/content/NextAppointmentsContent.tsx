import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function NextAppointmentsContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: appointments = [] } = useQuery({
    queryKey: ["widget-next-appts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, horses(name)")
        .eq("provider_id", user!.id)
        .gte("date", todayStr)
        .neq("status", "cancelled")
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(5);

      return (data || []).map((a: any) => ({
        id: a.id, date: a.date, time: a.time, status: a.status,
        horse_name: a.horses?.name || "–", service_type: a.service_type,
      }));
    },
    enabled: !!user?.id,
  });

  const getStatusDot = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "overdue": return "bg-destructive";
      case "confirmed": return "bg-primary";
      default: return "bg-blue-500";
    }
  };

  if (appointments.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine anstehenden Termine</p>;
  }

  // Group by date
  const grouped: Record<string, typeof appointments> = {};
  appointments.forEach((a) => {
    const label = a.date === todayStr ? "Heute"
      : a.date === format(addDays(new Date(), 1), "yyyy-MM-dd") ? "Morgen"
      : format(new Date(a.date), "EEE, d. MMM", { locale: de });
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(a);
  });

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([label, appts]) => (
        <div key={label}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          {appts.map((apt) => (
            <button
              key={apt.id}
              onClick={() => navigate("/calendar")}
              className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-muted/50 rounded px-1 transition-colors"
            >
              <span className="text-[11px] font-mono text-muted-foreground w-10">{apt.time?.slice(0, 5) || "–"}</span>
              <span className="text-sm flex-1 truncate text-foreground">{apt.horse_name}</span>
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", getStatusDot(apt.status))} />
            </button>
          ))}
        </div>
      ))}
      <button
        onClick={() => navigate("/calendar")}
        className="w-full text-xs text-primary hover:underline text-center pt-1"
      >
        Alle Termine →
      </button>
    </div>
  );
}
