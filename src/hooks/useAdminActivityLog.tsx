import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export type AdminActionType =
  | "provider_created"
  | "provider_suspended"
  | "provider_unsuspended"
  | "provider_deleted"
  | "provider_updated"
  | "client_created"
  | "feature_flags_updated"
  | "plan_override_updated"
  | "blog_post_created"
  | "blog_post_updated"
  | "blog_post_published"
  | "blog_post_unpublished"
  | "blog_post_deleted"
  | "bulk_action";

export interface LogActivityParams {
  actionType: AdminActionType;
  targetType?: "provider" | "client" | "blog_post" | "bulk";
  targetId?: string;
  targetName?: string;
  details?: Json;
}

export function useAdminActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async ({ actionType, targetType, targetId, targetName, details }: LogActivityParams) => {
      if (!user) {
        console.warn("[AdminActivityLog] No user found, skipping log");
        return;
      }

      try {
        const { error } = await supabase.from("admin_activity_log").insert([{
          admin_id: user.id,
          admin_email: user.email,
          action_type: actionType,
          target_type: targetType || null,
          target_id: targetId || null,
          target_name: targetName || null,
          details: details || null,
        }]);

        if (error) {
          console.error("[AdminActivityLog] Error logging activity:", error);
        } else {
          console.log(`[AdminActivityLog] Logged: ${actionType} on ${targetType}/${targetId}`);
        }
      } catch (err) {
        console.error("[AdminActivityLog] Unexpected error:", err);
      }
    },
    [user]
  );

  return { logActivity };
}
