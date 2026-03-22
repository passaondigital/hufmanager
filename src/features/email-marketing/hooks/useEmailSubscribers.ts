import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEmailSubscribers(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const subscribersQuery = useQuery({
    queryKey: ["email-subscribers", user?.id, listId],
    queryFn: async () => {
      let query = supabase
        .from("email_subscribers")
        .select("*, email_lists(name)")
        .order("created_at", { ascending: false });
      if (listId) query = query.eq("list_id", listId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const addSubscriber = useMutation({
    mutationFn: async (values: { list_id: string; email: string; first_name?: string; last_name?: string; postal_code?: string }) => {
      const { data, error } = await supabase
        .from("email_subscribers")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-subscribers"] }),
  });

  const deleteSubscriber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-subscribers"] }),
  });

  return {
    subscribers: subscribersQuery.data ?? [],
    isLoading: subscribersQuery.isLoading,
    addSubscriber,
    deleteSubscriber,
  };
}
