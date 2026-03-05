import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ServicePreset {
  id: string;
  provider_id: string;
  service_type: string;
  estimated_minutes: number;
  buffer_minutes: number;
  color_hex: string;
  profession_type: string;
}

const DEFAULT_PRESETS: Omit<ServicePreset, "id" | "provider_id">[] = [
  { service_type: "Barhuf", estimated_minutes: 45, buffer_minutes: 10, color_hex: "#22c55e", profession_type: "hoof_care" },
  { service_type: "Eisen", estimated_minutes: 60, buffer_minutes: 10, color_hex: "#3b82f6", profession_type: "hoof_care" },
  { service_type: "Kleben", estimated_minutes: 75, buffer_minutes: 10, color_hex: "#a855f7", profession_type: "hoof_care" },
  { service_type: "Beratung", estimated_minutes: 30, buffer_minutes: 5, color_hex: "#f59e0b", profession_type: "hoof_care" },
  { service_type: "Erstbehandlung", estimated_minutes: 90, buffer_minutes: 15, color_hex: "#22c55e", profession_type: "osteopath" },
  { service_type: "Kontrolle", estimated_minutes: 60, buffer_minutes: 10, color_hex: "#3b82f6", profession_type: "osteopath" },
  { service_type: "Behandlung", estimated_minutes: 60, buffer_minutes: 10, color_hex: "#22c55e", profession_type: "physiotherapist" },
  { service_type: "Ersttermin", estimated_minutes: 75, buffer_minutes: 15, color_hex: "#a855f7", profession_type: "physiotherapist" },
  { service_type: "Kontrolle", estimated_minutes: 45, buffer_minutes: 10, color_hex: "#3b82f6", profession_type: "dentist" },
  { service_type: "Behandlung", estimated_minutes: 60, buffer_minutes: 15, color_hex: "#22c55e", profession_type: "dentist" },
];

export function useServicePresets(professionType?: string) {
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

      // If no presets, seed defaults
      if (!data || data.length === 0) {
        const toInsert = DEFAULT_PRESETS.map(p => ({
          ...p,
          provider_id: user.id,
        }));
        
        const { data: inserted } = await supabase
          .from("service_time_presets" as any)
          .insert(toInsert as any)
          .select();
        
        return (inserted || []) as unknown as ServicePreset[];
      }

      return data as unknown as ServicePreset[];
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
  });

  const filtered = professionType
    ? presets.filter(p => p.profession_type === professionType)
    : presets;

  return { presets: filtered, allPresets: presets, isLoading };
}
