import { supabase } from "@/integrations/supabase/client";

/**
 * Hufi Navigation Action Layer — Phase C.
 *
 * Read-only, navigation + retrieval only. No INSERT/UPDATE/DELETE.
 * Kept separate from `hufi-actions.ts` (mutation actions: create_appointment,
 * send_invoice, …) so navigation flow can never accidentally mutate state.
 *
 * Each entry point returns `ActionOutcome`:
 *   - kind: "ok"        → caller navigates to `action.route` and speaks
 *                         `action.spokenConfirmation`.
 *   - kind: "clarify"   → multiple matches (e.g. several horses named Bella);
 *                         caller shows clarification chips/text.
 *   - kind: "fallback"  → nothing matched; caller shows the spoken fallback.
 */

export type ActionRole =
  | "provider"
  | "client"
  | "admin"
  | "employee"
  | "partner"
  | null;

export type NavActionId =
  | "open_horse"
  | "open_horses"
  | "open_appointments"
  | "open_calendar"
  | "open_route_day"
  | "open_invoices"
  | "open_customers"
  | "open_leads"
  | "open_settings";

export interface NavEntity {
  type: "horse" | "customer" | "appointment";
  id?: string;
  name?: string;
}

export interface ResolvedNavAction {
  id: NavActionId;
  route: string;
  spokenConfirmation: string;
  chipLabel: string;
  entity?: NavEntity;
}

export type ActionOutcome =
  | { kind: "ok"; action: ResolvedNavAction }
  | {
      kind: "clarify";
      message: string;
      spoken: string;
      options: { id: string; name: string }[];
    }
  | { kind: "fallback"; message: string; spoken: string };

export interface ResolveContext {
  userId: string;
  role: ActionRole;
}

// ─── Role-aware route resolution ────────────────────────────────────────────
function routeFor(action: NavActionId, role: ActionRole, horseId?: string): string {
  switch (action) {
    case "open_horse":
      if (!horseId) return routeFor("open_horses", role);
      if (role === "employee") return `/employee/pferd/${horseId}`;
      return `/pferd/${horseId}`;
    case "open_horses":
      if (role === "client") return "/client-horses";
      if (role === "employee") return "/employee/pferde";
      if (role === "partner") return "/partner-pferde";
      return "/pferde";
    case "open_appointments":
    case "open_calendar":
      if (role === "client") return "/client-kalender";
      if (role === "employee") return "/employee/kalender";
      return "/kalender";
    case "open_route_day":
      if (role === "employee") return "/employee/tour";
      if (role === "partner") return "/partner-tour";
      return "/tour";
    case "open_invoices":
      if (role === "client") return "/stall/rechnungen";
      return "/rechnungen";
    case "open_customers":
      if (role === "partner") return "/partner-kunden";
      return "/kunden";
    case "open_leads":
      return "/anfragen";
    case "open_settings":
      return "/einstellungen";
  }
}

function makeAction(
  id: NavActionId,
  role: ActionRole,
  spoken: string,
  chip: string,
  entity?: NavEntity
): ResolvedNavAction {
  return {
    id,
    route: routeFor(id, role, entity?.id),
    spokenConfirmation: spoken,
    chipLabel: chip,
    entity,
  };
}

// ─── Horse lookup (fuzzy by name, owner-scoped) ─────────────────────────────
interface HorseRow {
  id: string;
  name: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHorseMatch(query: string, horse: { name: string }): number {
  const q = normalize(query);
  const n = normalize(horse.name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(`${q} `) || n.startsWith(q + " ")) return 85;
  if (n.startsWith(q)) return 80;
  const padded = ` ${n} `;
  if (padded.includes(` ${q} `)) return 75;
  if (n.includes(q)) return 50;
  const qTokens = q.split(" ").filter((t) => t.length >= 2);
  const nTokens = new Set(n.split(" "));
  const hits = qTokens.filter((t) => nTokens.has(t)).length;
  if (hits > 0) return 20 + hits * 5;
  return 0;
}

export async function resolveHorseByName(
  query: string,
  ctx: ResolveContext
): Promise<HorseRow[]> {
  if (!query.trim() || !ctx.userId) return [];
  const cleaned = query.replace(/[%_]/g, " ").trim();
  if (!cleaned) return [];
  const like = `%${cleaned}%`;
  const { data, error } = await supabase
    .from("horses")
    .select("id, name, deleted_at")
    .eq("user_id", ctx.userId)
    .is("deleted_at", null)
    .ilike("name", like)
    .limit(10);

  if (error || !data) return [];
  const rows = (data as { id: string; name: string }[]).filter((r) => !!r.name);
  return rows
    .map((row) => ({ row, score: scoreHorseMatch(query, row) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ id: s.row.id, name: s.row.name }));
}

// ─── Public builders ─────────────────────────────────────────────────────────
export function buildOpenHorses(role: ActionRole): ResolvedNavAction {
  return makeAction("open_horses", role, "Ich öffne deine Pferde.", "Pferde geöffnet");
}

export function buildOpenAppointments(role: ActionRole): ResolvedNavAction {
  return makeAction("open_appointments", role, "Hier sind deine Termine.", "Kalender geöffnet");
}

export function buildOpenCalendar(role: ActionRole): ResolvedNavAction {
  return makeAction("open_calendar", role, "Ich öffne deinen Kalender.", "Kalender geöffnet");
}

export function buildOpenRouteDay(role: ActionRole): ResolvedNavAction {
  return makeAction("open_route_day", role, "Ich öffne deinen Tag.", "Tagestour geöffnet");
}

export function buildOpenInvoices(role: ActionRole): ResolvedNavAction {
  return makeAction("open_invoices", role, "Ich öffne deine Rechnungen.", "Rechnungen geöffnet");
}

export function buildOpenCustomers(role: ActionRole): ResolvedNavAction {
  return makeAction("open_customers", role, "Hier sind deine Kunden.", "Kunden geöffnet");
}

export function buildOpenLeads(role: ActionRole): ResolvedNavAction {
  return makeAction("open_leads", role, "Hier sind deine Anfragen.", "Anfragen geöffnet");
}

export function buildOpenSettings(role: ActionRole): ResolvedNavAction {
  return makeAction("open_settings", role, "Ich öffne deine Einstellungen.", "Einstellungen geöffnet");
}

export async function buildOpenHorse(
  query: string,
  ctx: ResolveContext
): Promise<ActionOutcome> {
  const matches = await resolveHorseByName(query, ctx);
  if (matches.length === 0) {
    return {
      kind: "fallback",
      message: `Ich konnte kein Pferd namens „${query}" finden.`,
      spoken: `Ich konnte kein Pferd namens ${query} finden.`,
    };
  }
  if (matches.length === 1) {
    const horse = matches[0];
    return {
      kind: "ok",
      action: makeAction(
        "open_horse",
        ctx.role,
        `Ich öffne ${horse.name}.`,
        `${horse.name} geöffnet`,
        { type: "horse", id: horse.id, name: horse.name }
      ),
    };
  }
  const top = matches.slice(0, 4);
  const names = top.map((h) => h.name).join(", ");
  return {
    kind: "clarify",
    message: `Mehrere Pferde gefunden: ${names}. Welches meinst du?`,
    spoken: `Ich habe mehrere Pferde gefunden: ${top.map((h) => h.name).join(", ")}. Welches meinst du?`,
    options: top,
  };
}

// ─── Top-level: target descriptor → outcome ─────────────────────────────────
export type NavTarget =
  | { kind: "horse"; query: string }
  | { kind: "horses" }
  | { kind: "appointments" }
  | { kind: "calendar" }
  | { kind: "route_day" }
  | { kind: "invoices" }
  | { kind: "customers" }
  | { kind: "leads" }
  | { kind: "settings" };

export async function runNavAction(
  target: NavTarget,
  ctx: ResolveContext
): Promise<ActionOutcome> {
  switch (target.kind) {
    case "horse":
      return buildOpenHorse(target.query, ctx);
    case "horses":
      return { kind: "ok", action: buildOpenHorses(ctx.role) };
    case "appointments":
      return { kind: "ok", action: buildOpenAppointments(ctx.role) };
    case "calendar":
      return { kind: "ok", action: buildOpenCalendar(ctx.role) };
    case "route_day":
      return { kind: "ok", action: buildOpenRouteDay(ctx.role) };
    case "invoices":
      return { kind: "ok", action: buildOpenInvoices(ctx.role) };
    case "customers":
      return { kind: "ok", action: buildOpenCustomers(ctx.role) };
    case "leads":
      return { kind: "ok", action: buildOpenLeads(ctx.role) };
    case "settings":
      return { kind: "ok", action: buildOpenSettings(ctx.role) };
  }
}
