import { useState, ReactNode, useEffect } from "react";
import { useModuleAccessTracker } from "@/hooks/useModuleAccessTracker";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { Lock } from "lucide-react";

type ModuleKey = "module_invoicing" | "module_chat" | "module_maps" | "module_academy" | "module_hufanalyse" | "module_network" | "module_analytics" | "beta_features";

const MODULE_NAMES: Record<ModuleKey, string> = {
  module_invoicing: "Rechnungsmodul",
  module_chat: "Chat-Modul",
  module_maps: "Karten & Navigation",
  module_academy: "Academy",
  module_hufanalyse: "Hufanalyse",
  module_network: "Netzwerk",
  module_analytics: "Analytics",
  beta_features: "Beta-Features",
};

interface ModuleGuardProps {
  children: ReactNode;
  module: ModuleKey;
  fallback?: ReactNode;
  trackOnMount?: boolean;
}

/**
 * Guards content behind module access checks.
 * Notifies admins when a provider attempts to access a disabled module.
 */
export function ModuleGuard({
  children,
  module,
  fallback,
  trackOnMount = false,
}: ModuleGuardProps) {
  const { checkAndTrackModuleAccess, hasModuleAccess } = useModuleAccessTracker();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasTracked, setHasTracked] = useState(false);

  const hasAccess = hasModuleAccess(module);
  const moduleName = MODULE_NAMES[module] || module;

  // Track on mount if requested (useful for page-level guards)
  useEffect(() => {
    if (trackOnMount && !hasAccess && !hasTracked) {
      checkAndTrackModuleAccess(module);
      setHasTracked(true);
    }
  }, [trackOnMount, hasAccess, hasTracked, checkAndTrackModuleAccess, module]);

  const handleClick = () => {
    if (!hasAccess) {
      checkAndTrackModuleAccess(module);
      setShowUpgrade(true);
    }
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return (
      <>
        <div onClick={handleClick} className="cursor-pointer">
          {fallback}
        </div>
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          featureName={moduleName}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        className="cursor-pointer opacity-50 hover:opacity-75 transition-opacity relative group"
      >
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureName={moduleName}
      />
    </>
  );
}

/**
 * Hook to check and track module access with admin notifications
 */
export function useModuleGuard() {
  const { checkAndTrackModuleAccess, hasModuleAccess, featureFlags } = useModuleAccessTracker();

  return {
    checkAccess: checkAndTrackModuleAccess,
    hasModuleAccess,
    featureFlags,
  };
}
