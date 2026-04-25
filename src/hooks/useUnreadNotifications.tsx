import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export function useUnreadNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
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

    const channelName = `notifications-count-${user.id}`;

    // Remove any stale channel with this name before creating a new one
    const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count", user.id] });

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, invalidate)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}
