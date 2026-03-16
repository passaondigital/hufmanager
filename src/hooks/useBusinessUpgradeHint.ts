import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to check if a private client should see the business upgrade hint
 * when creating their 6th horse.
 */
export function useBusinessUpgradeHint() {
  const { user, role } = useAuth();
  const [showHint, setShowHint] = useState(false);

  const checkAfterHorseCreation = useCallback(async () => {
    if (!user || role !== "client") return;

    // Check if already business or already dismissed
    const dismissed = localStorage.getItem(`hm_biz_hint_dismissed_${user.id}`);
    if (dismissed) return;

    // Check client_type
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_type")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.client_type === "commercial") return;

    // Count horses
    const { count } = await supabase
      .from("horses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (count && count >= 6) {
      setShowHint(true);
    }
  }, [user, role]);

  const dismiss = useCallback(() => {
    setShowHint(false);
    if (user) {
      localStorage.setItem(`hm_biz_hint_dismissed_${user.id}`, "true");
    }
  }, [user]);

  return { showHint, checkAfterHorseCreation, dismiss, setShowHint };
}
