import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { WidgetContentProps } from "./types";

export default function RevenueMonthContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const { data } = useQuery({
    queryKey: ["widget-revenue-month", user?.id, monthStart],
    queryFn: async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("applied_price, price")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const total = (appts || []).reduce((s, a) => s + (a.applied_price || a.price || 0), 0);
      const count = appts?.length || 0;
      return { total, count };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-foreground">{(data?.total || 0).toFixed(2)} €</span>
        <span className="text-xs text-muted-foreground">{format(now, "MMMM yyyy", { locale: undefined })}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {data?.count || 0} abgeschlossene Termine
      </p>
    </div>
  );
}
