import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { addWeeks, parseISO, differenceInDays, isBefore, addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { WidgetContentProps } from "./types";

export default function HoofStatusContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ["widget-hoof-status", user?.id],
    queryFn: async () => {
      const now = new Date();
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name, shoeing_interval")
        .is("deleted_at", null);

      if (!horses?.length) return [];

      const { data: appointments } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .in("horse_id", horses.map((h) => h.id))
        .eq("status", "completed")
        .order("date", { ascending: false });

      const lastByHorse: Record<string, string> = {};
      for (const a of appointments || []) {
        if (!lastByHorse[a.horse_id]) lastByHorse[a.horse_id] = a.date;
      }

      const result: { id: string; name: string; daysUntil: number }[] = [];
      for (const horse of horses) {
        const interval = horse.shoeing_interval || 6;
        const last = lastByHorse[horse.id];
        if (!last) {
          result.push({ id: horse.id, name: horse.name, daysUntil: -999 });
          continue;
        }
        const nextDue = addWeeks(parseISO(last), interval);
        const diff = differenceInDays(nextDue, now);
        if (diff <= 14) {
          result.push({ id: horse.id, name: horse.name, daysUntil: diff });
        }
      }

      return result.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Alle Pferde versorgt ✅</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(`/pferd/${item.id}`)}
          className="w-full flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded transition-colors text-left"
        >
          <div className={cn(
            "h-2 w-2 rounded-full shrink-0",
            item.daysUntil < 0 ? "bg-destructive" : item.daysUntil <= 7 ? "bg-amber-500" : "bg-muted-foreground"
          )} />
          <span className="text-sm flex-1 truncate text-foreground">{item.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {item.daysUntil < 0 ? `${Math.abs(item.daysUntil)} T. überfällig` : `In ${item.daysUntil} T.`}
          </span>
        </button>
      ))}
      <button onClick={() => navigate("/pferde")} className="w-full text-xs text-primary hover:underline text-center pt-1">
        Zur Pferdeübersicht →
      </button>
    </div>
  );
}
