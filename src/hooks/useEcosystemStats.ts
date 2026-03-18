import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EcosystemOverview {
  total_syncs: number;
  success_syncs: number;
  failed_syncs: number;
  success_rate: number;
  avg_duration_ms: number;
}

export interface AppSyncStats {
  total: number;
  success: number;
  failed: number;
  lastSync: string | null;
}

export interface SyncLogEntry {
  id: string;
  app_key: string;
  status: string;
  duration_ms: number | null;
  created_at: string;
  entity_type: string;
  sync_type: string;
}

export interface EcosystemError {
  id: string;
  app_key: string;
  error_code: string | null;
  error_message: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

export interface EcosystemSetting {
  id: string;
  app_key: string;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_direction: string;
  enabled_entity_types: string[];
  notification_on_sync: boolean;
  notification_on_error: boolean;
  last_sync_at: string | null;
}

export interface EcosystemStatsData {
  overview: EcosystemOverview;
  by_app: Record<string, AppSyncStats>;
  recent_logs: SyncLogEntry[];
  unresolved_errors: EcosystemError[];
  settings: EcosystemSetting[];
}

export function useEcosystemStats() {
  const { user } = useAuth();

  return useQuery<EcosystemStatsData>({
    queryKey: ["ecosystem-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-ecosystem", {
        body: { action: "get_sync_stats" },
      });

      if (error) throw error;
      return data as EcosystemStatsData;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
