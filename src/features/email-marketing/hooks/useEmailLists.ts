import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEmailLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ["email-lists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const createList = useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("email_lists")
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-lists"] }),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-lists"] }),
  });

  return { lists: listsQuery.data ?? [], isLoading: listsQuery.isLoading, createList, deleteList };
}
