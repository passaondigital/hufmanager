import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientOrdersContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ["client-orders-widget", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_orders")
        .select("id, title, status, created_at, horses(name)")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Keine Aufträge</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {orders.map((order: any) => {
        const isOpen = ["pending", "open"].includes(order.status);
        return (
          <button
            key={order.id}
            onClick={() => navigate("/client-orders")}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOpen ? "bg-amber-500" : "bg-green-500"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{order.title || "Auftrag"}</p>
              <p className="text-[11px] text-muted-foreground">
                {order.horses?.name || "–"} · {new Date(order.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isOpen ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}`}>
              {isOpen ? "Offen" : "Erledigt"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
