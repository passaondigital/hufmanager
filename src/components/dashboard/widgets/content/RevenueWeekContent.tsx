import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { useTaxConfig } from "@/hooks/useTaxConfig";
import type { WidgetContentProps } from "./types";

export default function RevenueWeekContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data } = useQuery({
    queryKey: ["widget-revenue-week", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("date, applied_price, price")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const dayAppts = (appts || []).filter((a) => a.date === dateStr);
        const sum = dayAppts.reduce((s, a) => s + (a.applied_price || a.price || 0), 0);
        return { label: format(d, "EEE", { locale: de }), value: sum };
      });

      const total = days.reduce((s, d) => s + d.value, 0);
      return { days, total };
    },
    enabled: !!user?.id,
  });

  const days = data?.days || [];
  const total = data?.total || 0;
  const maxVal = Math.max(...days.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-foreground">{total.toFixed(2)} €</span>
        <span className="text-[10px] text-muted-foreground">Diese Woche</span>
      </div>
      <div className="flex items-end gap-1 h-16">
        {days.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t bg-primary/70 transition-all"
              style={{ height: `${Math.max((d.value / maxVal) * 100, 4)}%` }}
            />
            <span className="text-[8px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Ø pro Tag: {(total / 7).toFixed(2)} €
      </p>
    </div>
  );
}
