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

export function useProductMembership(userId?: string | null): ProductMembershipState {
  const [memberships, setMemberships] = useState<ProductMembership[]>([]);
  const [activeProducts, setActiveProducts] = useState<ProductKey[]>([]);
  const [resolution, setResolution] = useState<ProductMembershipResolution>("resolving");
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setActiveProducts([]);
      setResolution("unavailable");
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_product_membership_context" as never);

    if (rpcError) {
      const message = rpcError.message || "Product membership resolver failed";
      if (isMissingMigrationError(message)) {
        setMemberships([]);
        setActiveProducts([]);
        setResolution("unavailable");
        setError("PRODUCT_MEMBERSHIP_MIGRATION_NOT_APPLIED");
      } else {
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
