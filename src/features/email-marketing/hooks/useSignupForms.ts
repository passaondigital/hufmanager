import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSignupForms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const formsQuery = useQuery({
    queryKey: ["email-signup-forms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_signup_forms")
        .select("*, email_lists(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const createForm = useMutation({
    mutationFn: async (values: {
      name: string;
      list_id: string;
      slug: string;
      fields_config: Record<string, boolean>;
      heading_text?: string;
      button_text?: string;
    }) => {
      const { data, error } = await supabase
        .from("email_signup_forms")
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-signup-forms"] }),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_signup_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-signup-forms"] }),
  });

  return { forms: formsQuery.data ?? [], isLoading: formsQuery.isLoading, createForm, deleteForm };
}
