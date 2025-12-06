import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing" | null;
type SubscriptionPlan = "starter" | "advanced" | "pro" | null;

interface SubscriptionContextType {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  loading: boolean;
  isActive: boolean;
  isPro: boolean;
  hasFeature: (feature: string) => boolean;
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

  const fetchSubscription = async () => {
    if (!user?.id) {
      setStatus(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return;
      }

      setStatus((data?.subscription_status as SubscriptionStatus) || "trialing");
      setPlan((data?.subscription_plan as SubscriptionPlan) || "starter");
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user?.id]);

  const isActive = status === "active" || status === "trialing";
  const isPro = plan === "pro" || plan === "advanced";

  const hasFeature = (feature: string): boolean => {
    if (!plan) return false;
    const planFeatures = PLAN_FEATURES[plan] || [];
    return planFeatures.includes(feature);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        plan,
        loading,
        isActive,
        isPro,
        hasFeature,
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
