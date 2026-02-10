import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FeatureStatus, 
  FeatureKey, 
  FeatureStatuses, 
  migrateBooleanToStatus, 
  isFeatureAccessible,
  shouldShowBetaBadge,
  isFeatureHidden
} from "@/types/featureFlags";

type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing" | "lifetime" | null;
type SubscriptionPlan = "starter" | "advanced" | "pro" | null;

// Legacy boolean flags for backward compatibility
interface FeatureFlags {
  module_invoicing: boolean;
  module_chat: boolean;
  module_maps: boolean;
  module_academy: boolean;
  module_hufanalyse: boolean;
  module_network: boolean;
  module_analytics: boolean;
  beta_features: boolean;
  module_office: boolean;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  module_invoicing: true,
  module_chat: true,
  module_maps: true,
  module_academy: true,
  module_hufanalyse: true,
  module_network: true,
  module_analytics: true,
  beta_features: false,
  module_office: false,
};

const DEFAULT_FEATURE_STATUSES: FeatureStatuses = {
  module_invoicing: 'public',
  module_chat: 'public',
  module_maps: 'public',
  module_academy: 'public',
  module_hufanalyse: 'public',
  module_network: 'public',
  module_analytics: 'public',
  beta_features: 'disabled',
  module_team: 'disabled',
  module_office: 'disabled',
};

interface SubscriptionContextType {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  loading: boolean;
  isActive: boolean;
  isPro: boolean;
  isSuspended: boolean;
  featureFlags: FeatureFlags;
  featureStatuses: FeatureStatuses;
  planOverride: string | null;
  accessValidUntil: Date | null;
  hasFeature: (feature: string) => boolean;
  hasModuleAccess: (module: keyof FeatureFlags) => boolean;
  getFeatureStatus: (feature: FeatureKey) => FeatureStatus;
  isFeatureVisible: (feature: FeatureKey) => boolean;
  showBetaBadge: (feature: FeatureKey) => boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Features restricted by plan
const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["basic_calendar", "basic_customers", "basic_horses"],
  advanced: ["basic_calendar", "basic_customers", "basic_horses", "chatbot", "gps_navigation", "reminders"],
  pro: ["basic_calendar", "basic_customers", "basic_horses", "chatbot", "gps_navigation", "reminders", "analytics", "academy", "partner_program"],
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [plan, setPlan] = useState<SubscriptionPlan>(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [featureStatuses, setFeatureStatuses] = useState<FeatureStatuses>(DEFAULT_FEATURE_STATUSES);
  const [planOverride, setPlanOverride] = useState<string | null>(null);
  const [accessValidUntil, setAccessValidUntil] = useState<Date | null>(null);

  const fetchSubscription = async () => {
    if (!user?.id) {
      setStatus(null);
      setPlan(null);
      setIsSuspended(false);
      setFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setFeatureStatuses(DEFAULT_FEATURE_STATUSES);
      setPlanOverride(null);
      setAccessValidUntil(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_plan, is_suspended, feature_flags, feature_statuses, plan_override, access_valid_until")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        // Non-blocking error - use defaults and allow dashboard to load
        console.warn("Error fetching subscription (non-blocking):", error.message);
        setLoading(false);
        return;
      }

      // Set suspension status
      setIsSuspended(data?.is_suspended === true);

      // Set feature flags with defaults (legacy boolean)
      const flags = data?.feature_flags as Record<string, boolean> | null;
      setFeatureFlags({
        ...DEFAULT_FEATURE_FLAGS,
        ...(flags || {}),
      });

      // Set feature statuses (new granular system)
      const statuses = data?.feature_statuses as FeatureStatuses | null;
      const migratedStatuses = migrateBooleanToStatus(flags, statuses);
      setFeatureStatuses({
        ...DEFAULT_FEATURE_STATUSES,
        ...migratedStatuses,
      });

      // Set plan override
      setPlanOverride(data?.plan_override || null);

      // Set access valid until
      setAccessValidUntil(data?.access_valid_until ? new Date(data.access_valid_until) : null);

      // Determine effective subscription status
      // Plan override takes precedence over Copecart
      if (data?.plan_override) {
        const override = data.plan_override;
        
        // Copecart plans set via admin
        if (override === "copecart_anfaenger") {
          setStatus("active");
          setPlan("starter");
        } else if (override === "copecart_fortgeschritten") {
          setStatus("active");
          setPlan("advanced");
        } else if (override === "copecart_profi") {
          setStatus("active");
          setPlan("pro");
        } else if (override === "lifetime_grant" || override === "employee") {
          setStatus("active");
          setPlan("pro");
        } else if (override === "manual_cash_1y" || override === "beta_tester") {
          // Check if access is still valid
          const validUntil = data?.access_valid_until ? new Date(data.access_valid_until) : null;
          if (validUntil && validUntil > new Date()) {
            setStatus("active");
            setPlan("pro");
          } else if (!validUntil) {
            // No expiry set, assume active
            setStatus("active");
            setPlan("pro");
          } else {
            // Expired
            setStatus("past_due");
            setPlan("starter");
          }
        }
      } else {
        // Use Copecart webhook status
        setStatus((data?.subscription_status as SubscriptionStatus) || "trialing");
        setPlan((data?.subscription_plan as SubscriptionPlan) || "starter");
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user?.id]);

  // If suspended, no access
  // Include "lifetime" status for users with lifetime access
  const isActive = !isSuspended && (status === "active" || status === "trialing" || status === "lifetime");
  
  // isPro: plan_override takes ABSOLUTE precedence over Copecart
  // Any non-null, non-standard override = Pro access
  // Lifetime status also grants Pro features
  const hasOverridePro = planOverride !== null && planOverride !== "standard";
  const hasValidAccess = accessValidUntil ? accessValidUntil > new Date() : true;
  const isPro = hasOverridePro && hasValidAccess 
    ? true 
    : plan === "pro" || plan === "advanced" || status === "lifetime";

  const hasFeature = (feature: string): boolean => {
    if (isSuspended) return false;
    if (!plan) return false;
    const planFeatures = PLAN_FEATURES[plan] || [];
    return planFeatures.includes(feature);
  };

  // Legacy boolean check for backward compatibility
  const hasModuleAccess = (module: keyof FeatureFlags): boolean => {
    if (isSuspended) return false;
    // Check new status system first
    const status = featureStatuses[module as FeatureKey];
    if (status) {
      return isFeatureAccessible(status);
    }
    // Fall back to boolean flags
    return featureFlags[module] === true;
  };

  // Get the status of a specific feature
  const getFeatureStatus = (feature: FeatureKey): FeatureStatus => {
    return featureStatuses[feature] || 'public';
  };

  // Check if feature should be visible in UI (not disabled)
  const isFeatureVisible = (feature: FeatureKey): boolean => {
    if (isSuspended) return false;
    const status = featureStatuses[feature];
    return !isFeatureHidden(status);
  };

  // Check if feature should show beta badge
  const showBetaBadge = (feature: FeatureKey): boolean => {
    return shouldShowBetaBadge(featureStatuses[feature]);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        plan,
        loading,
        isActive,
        isPro,
        isSuspended,
        featureFlags,
        featureStatuses,
        planOverride,
        accessValidUntil,
        hasFeature,
        hasModuleAccess,
        getFeatureStatus,
        isFeatureVisible,
        showBetaBadge,
        refetch: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
