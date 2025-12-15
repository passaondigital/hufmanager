import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export function useUnreadNotifications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          query.refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, query]);

  return query;
}
