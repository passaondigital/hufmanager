import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface HufrenteStats {
  totalReferred: number;
  activeReferrals: number;
  monthlyCommission: number;
  totalCommission: number;
  referrals: Array<{
    id: string;
    referred_name_anonymous: string | null;
    status: string;
    monthly_commission: number;
    total_commission: number;
    activated_at: string | null;
    created_at: string;
  }>;
  affiliateSlug: string | null;
}

export function useHufrenteStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["hufrente-stats", user?.id],
    queryFn: async (): Promise<HufrenteStats> => {
      if (!user?.id) throw new Error("Not authenticated");

      const [{ data: referrals }, { data: profile }] = await Promise.all([
        supabase
          .from("hufrente_referrals")
          .select("id, referred_name_anonymous, status, monthly_commission, total_commission, activated_at, created_at")
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("affiliate_slug, full_name")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const list = referrals || [];
      const active = list.filter((r) => r.status === "active");

      return {
        totalReferred: list.length,
        activeReferrals: active.length,
        monthlyCommission: active.reduce((sum, r) => sum + Number(r.monthly_commission || 0), 0),
        totalCommission: list.reduce((sum, r) => sum + Number(r.total_commission || 0), 0),
        referrals: list,
        affiliateSlug:
          profile?.affiliate_slug ||
          profile?.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ||
          user.id.slice(0, 8),
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
