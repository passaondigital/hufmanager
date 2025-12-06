import { useState, ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

interface SubscriptionGuardProps {
  children: ReactNode;
  feature: string;
  featureName: string;
  fallback?: ReactNode;
}

/**
 * Wraps content that requires a specific subscription feature.
 * Shows upgrade modal if user doesn't have access to the feature.
 */
export function SubscriptionGuard({
  children,
  feature,
  featureName,
  fallback,
}: SubscriptionGuardProps) {
  const { hasFeature, loading } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return null;
  }

  if (!hasFeature(feature)) {
    if (fallback) {
      return (
        <>
          <div onClick={() => setShowUpgrade(true)} className="cursor-pointer">
            {fallback}
          </div>
          <UpgradeModal
            open={showUpgrade}
            onOpenChange={setShowUpgrade}
            featureName={featureName}
          />
        </>
      );
    }

    return (
      <>
        <div 
          onClick={() => setShowUpgrade(true)} 
          className="cursor-pointer opacity-50 hover:opacity-75 transition-opacity"
        >
          {children}
        </div>
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          featureName={featureName}
        />
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check and gate features
 */
export function useFeatureGate() {
  const { hasFeature, isPro, status } = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    featureName: string;
  }>({ open: false, featureName: "" });

  const checkFeature = (feature: string, featureName: string): boolean => {
    if (!hasFeature(feature)) {
      setUpgradeModal({ open: true, featureName });
      return false;
    }
    return true;
  };

  return {
    hasFeature,
    isPro,
    isBlocked: status === "past_due",
    checkFeature,
    upgradeModal,
    closeUpgradeModal: () => setUpgradeModal({ open: false, featureName: "" }),
  };
}
