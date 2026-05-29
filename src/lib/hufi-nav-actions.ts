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
  | "open_settings"
  | "open_cockpit"
  | "open_management"
  | "open_team"
  | "open_lager"
  | "open_hufanalyse"
  | "open_analyse"
  | "open_chat";

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
    case "open_cockpit": return "/tour";
    case "open_management": return "/management";
    case "open_team": return "/team";
    case "open_lager": return "/lager";
    case "open_hufanalyse": return "/hufanalyse";
    case "open_analyse": return "/analyse";
    case "open_chat":
      if (role === "client") return "/client-chat";
      if (role === "employee") return "/employee/chat";
      return "/chat";
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

export function buildOpenCockpit(role: ActionRole): ResolvedNavAction {
  return makeAction("open_cockpit", role, "Tages-Cockpit geöffnet.", "Cockpit");
}
export function buildOpenManagement(role: ActionRole): ResolvedNavAction {
  return makeAction("open_management", role, "Management geöffnet.", "Management");
}
export function buildOpenTeam(role: ActionRole): ResolvedNavAction {
  return makeAction("open_team", role, "Team geöffnet.", "Team");
}
export function buildOpenLager(role: ActionRole): ResolvedNavAction {
  return makeAction("open_lager", role, "Lager geöffnet.", "Lager");
}
export function buildOpenHufanalyse(role: ActionRole): ResolvedNavAction {
  return makeAction("open_hufanalyse", role, "Hufanalyse geöffnet.", "Hufanalyse");
}
export function buildOpenAnalyse(role: ActionRole): ResolvedNavAction {
  return makeAction("open_analyse", role, "Analyse geöffnet.", "Analyse");
}
export function buildOpenChat(role: ActionRole): ResolvedNavAction {
  return makeAction("open_chat", role, "Chat geöffnet.", "Chat");
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

// ─── Phase E: Context-aware lookups ─────────────────────────────────────────

/** Returns the next scheduled/confirmed appointment for the user. */
async function fetchNextAppointment(ctx: ResolveContext): Promise<{
  date: string;
  time: string | null;
  horseName: string | null;
} | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("appointments")
    .select("id, date, time, horses(name)")
    .eq("provider_id", ctx.userId)
    .gte("date", today)
    .in("status", ["scheduled", "confirmed"])
    .order("date", { ascending: true })
    .order("time", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const horses = (data as any).horses;
  return {
    date: (data as any).date as string,
    time: (data as any).time as string | null,
    horseName: typeof horses === "object" && horses !== null ? (horses as any).name ?? null : null,
  };
}

/** Resolves a lead by partial name match (provider-scoped). */
async function resolveLeadByName(
  query: string,
  ctx: ResolveContext
): Promise<{ id: string; name: string }[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("leads")
    .select("id, name")
    .eq("provider_id", ctx.userId)
    .ilike("name", `%${query.replace(/[%_]/g, " ").trim()}%`)
    .limit(5);
  return (data ?? []).filter((r: any) => !!r.name).map((r: any) => ({ id: r.id, name: r.name }));
}

// ─── Phase E builders ────────────────────────────────────────────────────────

async function buildOpenNextAppointment(ctx: ResolveContext): Promise<ActionOutcome> {
  const appt = await fetchNextAppointment(ctx);
  if (!appt) {
    return {
      kind: "fallback",
      message: "Keine geplanten Termine gefunden.",
      spoken: "Du hast keine geplanten Termine.",
    };
  }
  const dateStr = new Date(appt.date).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });
  const timeStr = appt.time ? ` um ${appt.time.slice(0, 5)} Uhr` : "";
  const horseStr = appt.horseName ? ` bei ${appt.horseName}` : "";
  const spoken = `Dein nächster Termin ist am ${dateStr}${timeStr}${horseStr}.`;
  return {
    kind: "ok",
    action: makeAction("open_appointments", ctx.role, spoken, "Nächster Termin"),
  };
}

async function buildOpenLeadByName(query: string, ctx: ResolveContext): Promise<ActionOutcome> {
  const leads = await resolveLeadByName(query, ctx);
  if (!leads.length) {
    return {
      kind: "fallback",
      message: `Keine Anfrage von „${query}" gefunden.`,
      spoken: `Ich konnte keine Anfrage von ${query} finden.`,
    };
  }
  // Navigate to leads list regardless of match count — no detail route exists.
  return {
    kind: "ok",
    action: makeAction(
      "open_leads",
      ctx.role,
      leads.length === 1
        ? `Ich öffne die Anfragen. ${leads[0].name} ist dabei.`
        : `Ich habe ${leads.length} Anfragen gefunden.`,
      "Anfragen geöffnet"
    ),
  };
}

// ─── Top-level: target descriptor → outcome ─────────────────────────────────
export type NavTarget =
  | { kind: "horse"; query: string }
  | { kind: "horses" }
  | { kind: "appointments" }
  | { kind: "next_appointment" }
  | { kind: "calendar" }
  | { kind: "route_day" }
  | { kind: "invoices" }
  | { kind: "customers" }
  | { kind: "leads" }
  | { kind: "lead_by_name"; query: string }
  | { kind: "settings" }
  | { kind: "cockpit" }
  | { kind: "management" }
  | { kind: "team" }
  | { kind: "lager" }
  | { kind: "hufanalyse" }
  | { kind: "analyse" }
  | { kind: "chat" };

export async function runNavAction(
  target: NavTarget,
  ctx: ResolveContext
): Promise<ActionOutcome> {
  switch (target.kind) {
    case "horse":
      return buildOpenHorse(target.query, ctx);
    case "horses":
      return { kind: "ok", action: buildOpenHorses(ctx.role) };
    case "next_appointment":
      return buildOpenNextAppointment(ctx);
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
    case "lead_by_name":
      return buildOpenLeadByName(target.query, ctx);
    case "leads":
      return { kind: "ok", action: buildOpenLeads(ctx.role) };
    case "settings":
      return { kind: "ok", action: buildOpenSettings(ctx.role) };
    case "cockpit":     return { kind: "ok", action: buildOpenCockpit(ctx.role) };
    case "management":  return { kind: "ok", action: buildOpenManagement(ctx.role) };
    case "team":        return { kind: "ok", action: buildOpenTeam(ctx.role) };
    case "lager":       return { kind: "ok", action: buildOpenLager(ctx.role) };
    case "hufanalyse":  return { kind: "ok", action: buildOpenHufanalyse(ctx.role) };
    case "analyse":     return { kind: "ok", action: buildOpenAnalyse(ctx.role) };
    case "chat":        return { kind: "ok", action: buildOpenChat(ctx.role) };
  }
}
