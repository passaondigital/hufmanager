import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PferdeakteGlobalStats {
  total_pferdeakten: number;
  total_besitzer: number;
  new_last_7_days: number;
  new_last_30_days: number;
}

export interface CommunityMilestone {
  id: string;
  target_count: number;
  title: string;
  description: string | null;
  icon: string;
  reached_at: string | null;
  celebration_message: string | null;
}

export function usePferdeakteGlobalStats() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["pferdeakte-global-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pferdeakte_global_stats" as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as PferdeakteGlobalStats;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const milestonesQuery = useQuery({
    queryKey: ["pferdeakte-community-milestones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pferdeakte_community_milestones")
        .select("*")
        .order("target_count", { ascending: true });
      if (error) throw error;
      return data as unknown as CommunityMilestone[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const stats = statsQuery.data;
  const milestones = milestonesQuery.data || [];
  const total = stats?.total_pferdeakten ?? 0;

  // Find current and next milestone
  const nextMilestone = milestones.find((m) => m.target_count > total);
  const lastReached = milestones.filter((m) => m.target_count <= total).pop();

  const progressToNext = nextMilestone
    ? Math.min((total / nextMilestone.target_count) * 100, 100)
    : 100;

  return {
    stats,
    milestones,
    nextMilestone,
    lastReached,
    progressToNext,
    isLoading: statsQuery.isLoading || milestonesQuery.isLoading,
  };
}
