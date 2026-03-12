import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { WidgetContentProps } from "./types";

export default function OrderStatusContent(_props: WidgetContentProps) {
  const { user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["widget-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_orders")
        .select("id, service_description, order_status, created_at")
        .eq("provider_id", user!.id)
        .in("order_status", ["pending", "in_progress", "accepted"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (orders.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine offenen Aufträge</p>;
  }

  return (
    <div className="space-y-1">
      {orders.map((o) => (
        <div key={o.id} className="flex items-center gap-2 py-1.5 px-1">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            o.order_status === "in_progress" ? "bg-accent-foreground" : "bg-primary"
          )} />
          <span className="text-sm flex-1 truncate text-foreground">{o.service_description}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{o.order_status}</span>
        </div>
      ))}
    </div>
  );
}
