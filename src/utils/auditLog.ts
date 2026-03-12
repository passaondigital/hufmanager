/**
 * Horse Audit Log Helper
 * Logs actions to horse_audit_log for transparency.
 * Errors are silently caught — never shown to users.
 */
import { supabase } from "@/integrations/supabase/client";

export async function logHorseAction(
  horseId: string,
  actionType: string,
  actionDetail?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, readable_id")
      .eq("id", user.id)
      .single();

    // Determine role from user_roles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    await supabase.from("horse_audit_log").insert({
      horse_id: horseId,
      actor_id: user.id,
      actor_name: profile?.full_name || null,
      actor_kid: profile?.readable_id || null,
      actor_role: roleData?.role || "unknown",
      action_type: actionType,
      action_detail: actionDetail || null,
    } as any);
  } catch (err) {
    console.error("[AuditLog] Failed to log action:", err);
  }
}
