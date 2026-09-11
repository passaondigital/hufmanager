import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Mirrors get_hufmanager_access_context_v1()'s RETURNS TABLE shape exactly
// (supabase/migrations/20260911204100_add_hufmanager_slim_access_context_api_v1.sql).
export type HufmanagerSlimAccessReasonCode =
  | "ACTIVE_PAID"
  | "ACTIVE_TRIAL"
  | "CANCELLED_PERIOD_END_ACCESS"
  | "PAST_DUE_ACCESS_PRESERVED"
  | "FROZEN"
  | "TRIAL_EXPIRED"
  | "LOCKED"
  | "NO_ENTITLEMENT"
  | "REVIEW_REQUIRED";

export interface HufmanagerSlimAccessContext {
  hasAccess: boolean;
  entitlementStatus: string | null;
  billingStatus: string | null;
  trialStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  reasonCode: HufmanagerSlimAccessReasonCode | null;
}

interface UseHufmanagerSlimAccessResult {
  loading: boolean;
  context: HufmanagerSlimAccessContext | null;
  error: string | null;
  refetch: () => Promise<void>;
}

// Admins use HufManager as an administration surface, not a paying product
// membership -- ProtectedRoute already exempts them from the *other*
// (profiles.subscription_*) gate for the same reason; this hook does the
// same for consistency rather than introducing a second admin-detection
// convention.
export function useHufmanagerSlimAccess(): UseHufmanagerSlimAccessResult {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<HufmanagerSlimAccessContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    if (!user?.id || role === "admin") {
      setContext(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // "as never" cast follows the same established pattern as
    // useProductMembership.ts's calls to get_product_membership_context() --
    // this RPC is not yet in the generated Database types (that generation
    // is already stale for the whole lifecycle stack, not just this
    // migration; see this task's final report), not a workaround unique
    // to this hook.
    const { data, error: rpcError } = await supabase
      .rpc("get_hufmanager_access_context_v1" as never)
      .maybeSingle();

    if (rpcError) {
      // Non-blocking: an access-context read failure should not itself
      // read as "no access" -- surface it and let the caller decide,
      // matching useSubscription's own non-blocking error convention.
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setError(null);
    const row = data as {
      has_access: boolean;
      entitlement_status: string | null;
      billing_status: string | null;
      trial_status: string | null;
      trial_ends_at: string | null;
      current_period_end: string | null;
      reason_code: HufmanagerSlimAccessReasonCode | null;
    } | null;
    setContext(
      row
        ? {
            hasAccess: row.has_access === true,
            entitlementStatus: row.entitlement_status,
            billingStatus: row.billing_status,
            trialStatus: row.trial_status,
            trialEndsAt: row.trial_ends_at,
            currentPeriodEnd: row.current_period_end,
            reasonCode: row.reason_code,
          }
        : null,
    );
    setLoading(false);
  }, [user?.id, role]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  return { loading, context, error, refetch: fetchAccess };
}
