/**
 * Pferdeakte Live-Sync Hook
 * Subscribes to Supabase Realtime changes for a horse's data
 * and invalidates relevant queries when changes occur.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WATCHED_TABLES = [
  "appointments",
  "horse_health_logs",
  "horse_vaccinations",
  "horse_diary_entries",
  "partner_treatment_notes",
  "horse_documents",
  "hoof_photos",
  "horse_partner_access",
] as const;

/**
 * Hook to subscribe to realtime changes for a specific horse.
 * Invalidates all pferdeakte-related queries when data changes.
 */
export function usePferdeakteLiveSync(horseId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!horseId) return;

    const channel = supabase
      .channel(`pferdeakte-${horseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          filter: `horse_id=eq.${horseId}`,
        },
        (payload) => {
          const table = payload.table;

          // Invalidate specific queries based on changed table
          if (table === "appointments") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-timeline", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-status", horseId] });
          } else if (table === "horse_health_logs") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-news", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-status", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-timeline", horseId] });
          } else if (table === "horse_vaccinations") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-vacc-status", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-status", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-timeline", horseId] });
          } else if (table === "partner_treatment_notes") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-therapie", horseId] });
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-timeline", horseId] });
          } else if (table === "horse_documents" || table === "hoof_photos") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-timeline", horseId] });
          } else if (table === "horse_partner_access") {
            queryClient.invalidateQueries({ queryKey: ["pferdeakte-therapie", horseId] });
          } else {
            // Fallback: invalidate all pferdeakte queries for this horse
            queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0]?.toString().startsWith("pferdeakte") &&
                query.queryKey[1] === horseId,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [horseId, queryClient]);
}

/** Default staleTime for pferdeakte queries (2 minutes) */
export const PFERDEAKTE_STALE_TIME = 2 * 60 * 1000;

/** Shorter staleTime for dynamic data (30 seconds) */
export const PFERDEAKTE_DYNAMIC_STALE_TIME = 30 * 1000;
