/**
 * Notify all stakeholders of a horse about status changes.
 * Stakeholders include: providers (access_grants), partners (horse_partner_access),
 * employees (employee_horse_access), and care team members (horse_care_team).
 * The owner (client) is excluded — they are the one triggering the action.
 */
import { supabase } from "@/integrations/supabase/client";

export type HorseStatusEvent =
  | "deceased"
  | "stolen"
  | "transfer_initiated"
  | "transfer_completed"
  | "archived"
  | "access_revoked";

interface NotifyOptions {
  horseId: string;
  horseName: string;
  event: HorseStatusEvent;
  /** The user triggering the event — will be excluded from notifications */
  triggeredBy: string;
  /** Extra context for the notification message */
  extra?: Record<string, string>;
}

const EVENT_CONFIG: Record<
  HorseStatusEvent,
  { title: string; message: (name: string, extra?: Record<string, string>) => string; type: string; link?: string }
> = {
  deceased: {
    title: "🕊️ Pferd verstorben",
    message: (name) => `${name} wurde als verstorben gemeldet. Die Akte bleibt für den definierten Aufbewahrungszeitraum bestehen.`,
    type: "horse_status_deceased",
  },
  stolen: {
    title: "🚨 Pferd als gestohlen gemeldet",
    message: (name) => `${name} wurde als gestohlen gemeldet. Bitte kontaktieren Sie den Besitzer für weitere Informationen.`,
    type: "horse_status_stolen",
  },
  transfer_initiated: {
    title: "🔄 Besitzerwechsel eingeleitet",
    message: (name, extra) =>
      `${name} wird an ${extra?.buyerName || "einen neuen Besitzer"} übergeben. Ihr Zugang bleibt bestehen bis der neue Besitzer entscheidet.`,
    type: "horse_transfer_stakeholder",
  },
  transfer_completed: {
    title: "✅ Besitzerwechsel abgeschlossen",
    message: (name) =>
      `${name} hat einen neuen Besitzer. Bisherige Zugänge wurden widerrufen. Der neue Besitzer kann Ihnen erneut Zugang gewähren.`,
    type: "horse_transfer_completed_stakeholder",
  },
  archived: {
    title: "📦 Pferd archiviert",
    message: (name) => `${name} wurde vom Besitzer archiviert.`,
    type: "horse_status_archived",
  },
  access_revoked: {
    title: "🔒 Zugang widerrufen",
    message: (name) => `Ihr Zugang zur Akte von ${name} wurde durch einen Besitzerwechsel widerrufen.`,
    type: "horse_access_revoked",
  },
};

/**
 * Collects all unique user IDs connected to this horse (providers, partners, employees, care team)
 * excluding the triggering user.
 */
async function collectStakeholders(horseId: string, excludeUserId: string): Promise<string[]> {
  const userIds = new Set<string>();

  // 1. Get horse owner_id to find providers via access_grants
  const { data: horse } = await supabase
    .from("horses")
    .select("owner_id")
    .eq("id", horseId)
    .maybeSingle();

  if (horse?.owner_id) {
    // Providers connected to the owner
    const { data: grants } = await supabase
      .from("access_grants")
      .select("provider_id")
      .eq("client_id", horse.owner_id)
      .eq("is_active", true);

    grants?.forEach((g) => userIds.add(g.provider_id));
  }

  // 2. Partners with horse_partner_access
  const { data: partners } = await supabase
    .from("horse_partner_access")
    .select("partner_profile_id")
    .eq("horse_id", horseId)
    .eq("status", "active");

  partners?.forEach((p) => {
    if (p.partner_profile_id) userIds.add(p.partner_profile_id);
  });

  // 3. Employees with employee_horse_access
  const { data: employees } = await supabase
    .from("employee_horse_access")
    .select("employee_id")
    .eq("horse_id", horseId)
    .eq("can_view", true);

  employees?.forEach((e) => {
    if (e.employee_id) userIds.add(e.employee_id);
  });

  // 4. Care team owner (horse_care_team tracks team_sharing, owner_id is the horse owner)
  const { data: careTeam } = await supabase
    .from("horse_care_team")
    .select("owner_id")
    .eq("horse_id", horseId);

  careTeam?.forEach((c) => {
    if (c.owner_id) userIds.add(c.owner_id);
  });

  // 5. Stallbetreiber with stall_horse_access
  const { data: stallAccess } = await supabase
    .from("stall_horse_access" as any)
    .select("stall_owner_id")
    .eq("horse_id", horseId);

  (stallAccess as any[])?.forEach((s) => {
    if (s.stall_owner_id) userIds.add(s.stall_owner_id);
  });

  // 6. Add horse owner if not the trigger
  if (horse?.owner_id) userIds.add(horse.owner_id);

  // Remove the triggering user
  userIds.delete(excludeUserId);

  return Array.from(userIds);
}

/**
 * Send notifications to all stakeholders of a horse.
 */
export async function notifyHorseStakeholders(options: NotifyOptions): Promise<void> {
  const { horseId, horseName, event, triggeredBy, extra } = options;

  try {
    const stakeholders = await collectStakeholders(horseId, triggeredBy);
    if (stakeholders.length === 0) return;

    const config = EVENT_CONFIG[event];

    const notifications = stakeholders.map((userId) => ({
      user_id: userId,
      title: config.title,
      message: config.message(horseName, extra),
      type: config.type,
      link: config.link || null,
    }));

    // Batch insert (Supabase supports array insert)
    const { error } = await supabase.from("notifications").insert(notifications as any);
    if (error) console.error("[notifyHorseStakeholders] Insert error:", error);
  } catch (err) {
    console.error("[notifyHorseStakeholders] Failed:", err);
  }
}

/**
 * Revoke all partner/employee/care-team access for a horse and notify affected users.
 * Used when a horse changes ownership.
 */
export async function revokeAndNotifyAllAccess(
  horseId: string,
  horseName: string,
  triggeredBy: string
): Promise<void> {
  try {
    // Collect stakeholders BEFORE revoking
    const stakeholders = await collectStakeholders(horseId, triggeredBy);

    // Revoke horse_partner_access
    await supabase
      .from("horse_partner_access")
      .update({ revoked_at: new Date().toISOString(), is_active: false, status: "revoked" } as any)
      .eq("horse_id", horseId)
      .eq("status", "active");

    // Revoke employee_horse_access (set can_view to false)
    await supabase
      .from("employee_horse_access")
      .update({ can_view: false, can_edit: false, can_add_notes: false } as any)
      .eq("horse_id", horseId)
      .eq("can_view", true);

    // Deactivate care team sharing
    await supabase
      .from("horse_care_team")
      .update({ team_sharing_enabled: false } as any)
      .eq("horse_id", horseId)
      .eq("team_sharing_enabled", true);

    // Notify all affected stakeholders
    if (stakeholders.length > 0) {
      const config = EVENT_CONFIG.access_revoked;
      const notifications = stakeholders.map((userId) => ({
        user_id: userId,
        title: config.title,
        message: config.message(horseName),
        type: config.type,
      }));

      await supabase.from("notifications").insert(notifications as any);
    }
  } catch (err) {
    console.error("[revokeAndNotifyAllAccess] Failed:", err);
  }
}
