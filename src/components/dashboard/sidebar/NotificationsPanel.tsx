import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export function NotificationsPanel() {
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: ["sidebar-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, created_at, is_read, link")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-primary" />
        Benachrichtigungen
        {notifications.length > 0 && (
          <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {notifications.length}
          </span>
        )}
      </h3>
      {notifications.length === 0 ? (
        <p className="text-xs text-muted-foreground">Keine neuen Benachrichtigungen</p>
      ) : (
        <div className="space-y-0">
          {notifications.map((n) => (
            <div key={n.id} className="py-2 border-b border-border/50 last:border-0">
              <p className="text-xs text-foreground font-medium">{n.title}</p>
              {n.message && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>}
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                {formatDistanceToNow(new Date(n.created_at), { locale: de, addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
