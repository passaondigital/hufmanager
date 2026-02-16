import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useKiSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: kiEnabled = true, isLoading } = useQuery({
    queryKey: ["ki-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return true;
      const { data, error } = await supabase
        .from("business_settings")
        .select("ki_features_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.ki_features_enabled ?? true;
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("business_settings")
        .update({ ki_features_enabled: enabled } as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ki-settings", user?.id] });
    },
  });

  return {
    kiEnabled,
    isLoading,
    setKiEnabled: (enabled: boolean) => toggleMutation.mutate(enabled),
    isToggling: toggleMutation.isPending,
  };
}
