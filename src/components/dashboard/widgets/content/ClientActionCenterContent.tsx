import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientActionCenterContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["client-action-center", user?.id],
    queryFn: async () => {
      const [messagesRes, ordersRes, horsesRes] = await Promise.all([
        // Unread messages
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user!.id)
          .eq("read", false),
        // Open orders
        supabase
          .from("service_orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user!.id)
          .in("status", ["pending", "open"]),
        // Horses with issues
        supabase
          .from("horses")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user!.id)
          .is("deleted_at", null)
          .neq("health_status", "healthy")
          .not("health_status", "is", null),
      ]);

      return {
        unreadMessages: messagesRes.count || 0,
        openOrders: ordersRes.count || 0,
        healthIssues: horsesRes.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const actions = [
    {
      icon: MessageSquare,
      label: "Ungelesene Nachrichten",
      count: data?.unreadMessages || 0,
      path: "/client-chat",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Receipt,
      label: "Offene Aufträge",
      count: data?.openOrders || 0,
      path: "/client-orders",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: AlertTriangle,
      label: "Gesundheits-Befunde",
      count: data?.healthIssues || 0,
      path: "/client-horses",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  const totalActions = actions.reduce((sum, a) => sum + a.count, 0);

  if (totalActions === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500/60 mb-2" />
        <p className="text-sm font-medium text-foreground">Alles erledigt!</p>
        <p className="text-xs text-muted-foreground mt-0.5">Keine offenen Aufgaben</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.filter(a => a.count > 0).map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors text-left"
        >
          <div className={`w-9 h-9 rounded-lg ${action.bgColor} flex items-center justify-center flex-shrink-0`}>
            <action.icon className={`h-4.5 w-4.5 ${action.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{action.label}</p>
          </div>
          <span className={`text-sm font-bold ${action.color} tabular-nums`}>
            {action.count}
          </span>
        </button>
      ))}
    </div>
  );
}
