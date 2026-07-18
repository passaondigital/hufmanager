import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface HufiVoiceCreditsRow {
  monthly_base_cents: number;
  monthly_balance_cents: number;
  monthly_reset_at: string;
  purchased_balance_cents: number;
  purchased_expires_at: string | null;
}

export interface VoiceCreditTransaction {
  id: string;
  amount_cents: number;
  source: "monthly_base" | "purchased";
  type: "usage" | "purchase" | "monthly_reset" | "admin_adjustment";
  description: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// 1 "Cent" = 1 Sekunde Premium-Voice — siehe consume_hufi_voice_credit() in
// der Migration 20260717120000_hufi_voice_credits.sql.
export function centsToSeconds(cents: number): number {
  return Math.max(cents, 0);
}

export function formatMinSec(totalSeconds: number): string {
  const s = Math.max(Math.round(totalSeconds), 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function useHufiVoiceCredits() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["hufi-voice-credits", user?.id],
    queryFn: async (): Promise<HufiVoiceCreditsRow | null> => {
      const { data, error } = await supabase.rpc("get_hufi_voice_credits", { p_user_id: user!.id });
      if (error) throw error;
      return data as HufiVoiceCreditsRow;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const purchasedExpired = !!(data?.purchased_expires_at && new Date(data.purchased_expires_at) < new Date());
  const purchasedUsableCents = purchasedExpired ? 0 : (data?.purchased_balance_cents ?? 0);
  const monthlyBalanceCents = data?.monthly_balance_cents ?? 0;
  const totalAvailableCents = monthlyBalanceCents + purchasedUsableCents;
  const monthlyBaseCents = data?.monthly_base_cents ?? 0;
  const percentRemaining = monthlyBaseCents > 0
    ? Math.round((monthlyBalanceCents / monthlyBaseCents) * 100)
    : (totalAvailableCents > 0 ? 100 : 0);
  const isLow = monthlyBaseCents > 0 && percentRemaining < 20 && purchasedUsableCents === 0;

  return {
    data,
    isLoading,
    refetch,
    monthlyBalanceCents,
    monthlyBaseCents,
    purchasedBalanceCents: purchasedUsableCents,
    purchasedExpiresAt: data?.purchased_expires_at ?? null,
    purchasedExpired,
    totalAvailableCents,
    percentRemaining,
    isLow,
  };
}

export function useHufiVoiceCreditHistory(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hufi-voice-credit-history", user?.id, limit],
    queryFn: async (): Promise<VoiceCreditTransaction[]> => {
      const { data, error } = await supabase
        .from("hufi_voice_credit_transactions")
        .select("id, amount_cents, source, type, description, duration_seconds, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as VoiceCreditTransaction[];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}
