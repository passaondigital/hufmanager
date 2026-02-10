import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

type ModuleKey = "module_invoicing" | "module_chat" | "module_maps" | "module_academy" | "module_hufanalyse" | "module_network" | "module_analytics" | "beta_features" | "module_office";

const MODULE_LABELS: Record<ModuleKey, string> = {
  module_invoicing: "Rechnungen",
  module_chat: "Chat",
  module_maps: "Karten/Navigation",
  module_academy: "Academy",
  module_hufanalyse: "Hufanalyse",
  module_network: "Netzwerk",
  module_analytics: "Analytics",
  beta_features: "Beta-Features",
  module_office: "Mein Office",
};

/**
 * Hook to track module access attempts and notify admins when providers try to access disabled modules
 */
export function useModuleAccessTracker() {
  const { user, role } = useAuth();
  const { hasModuleAccess, featureFlags } = useSubscription();

  const notifyAdminsOfBlockedAccess = useCallback(async (moduleName: ModuleKey) => {
    if (!user?.id || role !== "provider") return;

    try {
      // Get user profile for display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, readable_id")
        .eq("id", user.id)
        .single();

      const providerName = profile?.full_name || profile?.email || profile?.readable_id || user.id;
      const moduleLabel = MODULE_LABELS[moduleName] || moduleName;

      // Get all admin user IDs
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (!adminRoles || adminRoles.length === 0) return;

      // Create notifications for all admins
      const notifications = adminRoles.map((admin) => ({
        user_id: admin.user_id,
        title: "Modul-Zugriff blockiert",
        message: `Provider "${providerName}" hat versucht, auf das deaktivierte Modul "${moduleLabel}" zuzugreifen.`,
        type: "module_access_blocked",
        link: `/admin/mission-control`,
      }));

      await supabase.from("notifications").insert(notifications);

      console.log(`Admin notification sent: ${providerName} tried to access disabled module ${moduleLabel}`);
    } catch (error) {
      console.error("Failed to notify admins of blocked module access:", error);
    }
  }, [user?.id, role]);

  /**
   * Check module access and notify admins if access is denied
   * Returns true if access is granted, false otherwise
   */
  const checkAndTrackModuleAccess = useCallback((moduleName: ModuleKey): boolean => {
    const hasAccess = hasModuleAccess(moduleName);
    
    if (!hasAccess && role === "provider") {
      // Notify admins asynchronously (don't block the UI)
      notifyAdminsOfBlockedAccess(moduleName);
    }

    return hasAccess;
  }, [hasModuleAccess, role, notifyAdminsOfBlockedAccess]);

  return {
    checkAndTrackModuleAccess,
    hasModuleAccess,
    featureFlags,
  };
}
