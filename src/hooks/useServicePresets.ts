import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ServicePreset {
  id: string;
  provider_id: string;
  service_type: string;
  estimated_minutes: number;
  buffer_minutes: number;
  color_hex: string;
}

export function useServicePresets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["service-time-presets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("service_time_presets" as any)
        .select("*")
        .eq("provider_id", user.id)
        .order("service_type");
      
      if (error) {
        console.error("Error fetching presets:", error);
        return [];
      }

      return (data || []) as unknown as ServicePreset[];
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
  });

  // Build color map for quick lookup by service_type
  const colorMap: Record<string, string> = {};
  presets.forEach(p => { colorMap[p.service_type] = p.color_hex; });

  return { presets, colorMap, isLoading };
}
