import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getProfessionConfig, type ProfessionConfig } from "@/lib/profession-config";

export function useProfessionConfig(): ProfessionConfig {
  const { user } = useAuth();

  const { data: professionType } = useQuery({
    queryKey: ["profession-type", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("profession_type")
        .eq("id", user!.id)
        .maybeSingle();
      return (data as any)?.profession_type as string | null ?? null;
    },
  });

  return getProfessionConfig(professionType);
}
