import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_SPLITTER_MIGRATION_VERSION,
  resolveProductMembership,
  type ProductKey,
  type ProductMembership,
  type ProductMembershipResolution,
} from "@/lib/product-membership";

interface ProductMembershipState {
  memberships: ProductMembership[];
  activeProducts: ProductKey[];
  resolution: ProductMembershipResolution;
  loading: boolean;
  error: string | null;
  saveChoice: (product: ProductKey) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

const isMissingMigrationError = (message: string) =>
  message.includes("product_memberships") ||
  message.includes("get_product_membership_context") ||
  message.includes("select_product_membership") ||
  message.includes("does not exist") ||
  message.includes("Could not find the function");

type CachedMembership = {
  memberships: ProductMembership[];
  activeProducts: ProductKey[];
  resolution: ProductMembershipResolution;
  error: string | null;
};

// ProtectedRoute (and with it ProductChoiceGate) mounts anew for every
// top-level route element. Remember the last resolved answer per user so a
// remount renders at once instead of blocking on the RPC again (which is
// 404 in production while the splitter migration is not applied).
const membershipCache = new Map<string, CachedMembership>();

export function clearProductMembershipCache() {
  membershipCache.clear();
}

export function useProductMembership(userId?: string | null): ProductMembershipState {
  const cached = userId ? membershipCache.get(userId) : undefined;
  const [memberships, setMemberships] = useState<ProductMembership[]>(cached?.memberships ?? []);
  const [activeProducts, setActiveProducts] = useState<ProductKey[]>(cached?.activeProducts ?? []);
  const [resolution, setResolution] = useState<ProductMembershipResolution>(cached?.resolution ?? "resolving");
  const [loading, setLoading] = useState(Boolean(userId) && !cached);
  const [error, setError] = useState<string | null>(cached?.error ?? null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setActiveProducts([]);
      setResolution("unavailable");
      setLoading(false);
      setError(null);
      return;
    }

    if (!membershipCache.has(userId)) {
      setLoading(true);
      setError(null);
    }

    const { data, error: rpcError } = await supabase.rpc("get_product_membership_context" as never);

    if (rpcError) {
      const message = rpcError.message || "Product membership resolver failed";
      if (isMissingMigrationError(message)) {
        membershipCache.set(userId, {
          memberships: [],
          activeProducts: [],
          resolution: "unavailable",
          error: "PRODUCT_MEMBERSHIP_MIGRATION_NOT_APPLIED",
        });
        setMemberships([]);
        setActiveProducts([]);
        setResolution("unavailable");
        setError("PRODUCT_MEMBERSHIP_MIGRATION_NOT_APPLIED");
      } else {
        // Transient failures are not cached: the next mount asks again.
        membershipCache.delete(userId);
        setMemberships([]);
        setActiveProducts([]);
        setResolution("error");
        setError(message);
      }
      setLoading(false);
      return;
    }

    const nextMemberships = (data || []) as ProductMembership[];
    const nextResolution = resolveProductMembership(nextMemberships);
    membershipCache.set(userId, {
      memberships: nextMemberships,
      activeProducts: nextResolution.activeProducts,
      resolution: nextResolution.resolution,
      error: null,
    });
    setError(null);
    setMemberships(nextMemberships);
    setActiveProducts(nextResolution.activeProducts);
    setResolution(nextResolution.resolution);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveChoice = useCallback(
    async (product: ProductKey) => {
      if (!userId) {
        return { error: new Error("AUTH_REQUIRED") };
      }

      setLoading(true);
      setError(null);

      const { error: rpcError } = await supabase.rpc("select_product_membership" as never, {
        _product: product,
        _migration_version: PRODUCT_SPLITTER_MIGRATION_VERSION,
      } as never);

      if (rpcError) {
        const message = rpcError.message || "Product membership save failed";
        setError(message);
        setLoading(false);
        return { error: new Error(message) };
      }

      await refresh();
      return { error: null };
    },
    [refresh, userId],
  );

  return {
    memberships,
    activeProducts,
    resolution,
    loading,
    error,
    saveChoice,
    refresh,
  };
}
