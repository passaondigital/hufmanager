import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useModuleFlags() {
  const { data } = useQuery({
    queryKey: ["admin-module-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", [
          "affiliate_module_enabled",
          "cooperation_module_enabled",
          "internal_staff_module_enabled",
          "education_module_enabled",
        ]);

      const map: Record<string, boolean> = {};
      (data || []).forEach((row) => {
        map[row.key] = row.value === true || row.value === "true";
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    affiliateEnabled: data?.affiliate_module_enabled ?? false,
    cooperationEnabled: data?.cooperation_module_enabled ?? false,
    staffEnabled: data?.internal_staff_module_enabled ?? false,
    educationEnabled: data?.education_module_enabled ?? false,
  };
}
