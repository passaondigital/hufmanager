import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export type VaultPlan = "light" | "pro" | "gestuet" | "unlimited";
export type VaultPlanStatus = "active" | "cancelled" | "past_due" | "trialing";

export type VaultAccessSource =
  | "vault_plan"
  | "hufmanager_pro"
  | "lifetime_grant"
  | "manual_cash_1y"
  | "beta_tester"
  | "none";

interface VaultAccessState {
  loading: boolean;
  hasAccess: boolean;
  source: VaultAccessSource;
  vaultPlan: VaultPlan | null;
  vaultPlanStatus: VaultPlanStatus | null;
  refetch: () => Promise<void>;
}

/**
 * Single source of truth for "may the current user use the document vault?".
 * Mirrors public.has_vault_access(uid) in the database, so client-side gating
 * and RLS stay in sync.
 *
 * Even if a UI consumer ignores this hook, the database RLS policy in
 * 20260510120000_vault_premium_gate.sql still blocks unauthorized writes.
 */
export function useVaultAccess(): VaultAccessState {
  const { user } = useAuth();
  const { plan, status, planOverride, accessValidUntil, isSuspended, loading: subLoading } = useSubscription();

  const [vaultPlan, setVaultPlan] = useState<VaultPlan | null>(null);
  const [vaultPlanStatus, setVaultPlanStatus] = useState<VaultPlanStatus | null>(null);
  const [vaultLoading, setVaultLoading] = useState(true);

  const fetchVaultPlan = async () => {
    if (!user?.id) {
      setVaultPlan(null);
      setVaultPlanStatus(null);
      setVaultLoading(false);
      return;
    }
    setVaultLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("vault_plan, vault_plan_status")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("useVaultAccess: profile fetch failed (non-blocking):", error.message);
      setVaultPlan(null);
      setVaultPlanStatus(null);
    } else {
      setVaultPlan((data?.vault_plan as VaultPlan | null) ?? null);
      setVaultPlanStatus((data?.vault_plan_status as VaultPlanStatus | null) ?? null);
    }
    setVaultLoading(false);
  };

  useEffect(() => {
    fetchVaultPlan();
  }, [user?.id]);

  const loading = subLoading || vaultLoading;

  let source: VaultAccessSource = "none";
  let hasAccess = false;

  if (!isSuspended) {
    if (vaultPlan && (vaultPlanStatus === "active" || vaultPlanStatus === "trialing")) {
      hasAccess = true;
      source = "vault_plan";
    } else if (
      (plan === "pro" || plan === "duo" || plan === "team" || plan === "advanced") &&
      (status === "active" || status === "trialing" || status === "lifetime")
    ) {
      hasAccess = true;
      source = "hufmanager_pro";
    } else if (planOverride === "lifetime_grant" || planOverride === "employee") {
      const stillValid = !accessValidUntil || accessValidUntil > new Date();
      if (stillValid) {
        hasAccess = true;
        source = planOverride === "employee" ? "lifetime_grant" : "lifetime_grant";
      }
    } else if (planOverride === "manual_cash_1y" || planOverride === "beta_tester") {
      if (accessValidUntil && accessValidUntil > new Date()) {
        hasAccess = true;
        source = planOverride === "beta_tester" ? "beta_tester" : "manual_cash_1y";
      }
    }
  }

  return {
    loading,
    hasAccess,
    source,
    vaultPlan,
    vaultPlanStatus,
    refetch: fetchVaultPlan,
  };
}
