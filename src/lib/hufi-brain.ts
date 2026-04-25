import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

export interface HufiMemory {
  id: string;
  user_id: string;
  category: "routine" | "preference" | "horse_pattern" | "client_note" | "alert" | "dsgvo" | "permission";
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: "voice" | "manual" | "system" | "ai";
  last_updated: string;
  expires_at: string | null;
}

export interface HufiPermission {
  id: string;
  grantor_id: string;
  grantee_id: string;
  resource_type: "horse" | "invoice" | "befund" | "calendar";
  resource_id: string;
  permission_level: "read" | "write" | "full";
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  dsgvo_consent: boolean;
}

export interface HufiAppointment {
  id: string;
  date: string;
  time: string | null;
  status: string;
  horse_name?: string;
  client_name?: string;
}

export interface HufiHorse {
  id: string;
  name: string;
  last_appointment_date?: string;
  weeks_overdue?: number;
}

export interface HufiAiBefund {
  id: string;
  created_at: string;
  pferd_name: string | null;
  befund_text: string | null;
  massnahme: string | null;
  naechster_termin: string | null;
}

export interface HufiContext {
  user: {
    id: string;
    name: string | null;
    role: string | null;
    userType: "pro" | "owner" | null;
  };
  todayAppointments: HufiAppointment[];
  openLeads: number;
  unpaidInvoices: number;
  overdueHorses: HufiHorse[];
  memory: HufiMemory[];
  lastBefunde: HufiAiBefund[];
  openOrders: number;
  permissions: HufiPermission[];
}

// ── fetchHufiContext ──────────────────────────────────────────────────────────

export async function fetchHufiContext(
  userId: string,
  role: string | null,
): Promise<HufiContext> {
  const today = format(new Date(), "yyyy-MM-dd");
  const eightWeeksAgo = format(
    new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd",
  );

  const db = supabase as unknown as Record<string, (...args: unknown[]) => unknown>;
  const from = (table: string) => (db.from as (t: string) => ReturnType<typeof supabase.from>)(table);

  const [
    profileRes,
    todayApptRes,
    leadsRes,
    invoicesRes,
    completedApptsRes,
    memoryRes,
    befundeRes,
    ordersRes,
    permissionsRes,
  ] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("full_name, user_type")
      .eq("id", userId)
      .single(),
    supabase
      .from("appointments")
      .select("id, date, time, status, horses(name), client:profiles!client_id(full_name)")
      .eq("provider_id", userId)
      .eq("date", today)
      .in("status", ["scheduled", "confirmed"])
      .order("time", { ascending: true }),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", userId)
      .eq("status", "neu"),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", userId)
      .neq("payment_status", "paid"),
    supabase
      .from("appointments")
      .select("horse_id, date, horses(id, name)")
      .eq("provider_id", userId)
      .eq("status", "completed")
      .lt("date", eightWeeksAgo)
      .order("date", { ascending: false })
      .limit(60),
    from("hufi_memory")
      .select("*")
      .eq("user_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    from("ai_befunde")
      .select("id, created_at, pferd_name, befund_text, massnahme, naechster_termin")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("service_orders")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", userId)
      .in("order_status", ["pending", "open", "in_progress"]),
    from("hufi_permissions")
      .select("*")
      .or(`grantor_id.eq.${userId},grantee_id.eq.${userId}`)
      .is("revoked_at", null),
  ]);

  const profile =
    profileRes.status === "fulfilled" ? (profileRes.value as { data: { full_name: string; user_type: string } | null }).data : null;
  const rawAppts =
    todayApptRes.status === "fulfilled" ? ((todayApptRes.value as { data: unknown[] | null }).data ?? []) : [];
  const leadsCount =
    leadsRes.status === "fulfilled" ? ((leadsRes.value as { count: number | null }).count ?? 0) : 0;
  const invoicesCount =
    invoicesRes.status === "fulfilled" ? ((invoicesRes.value as { count: number | null }).count ?? 0) : 0;
  const completedAppts =
    completedApptsRes.status === "fulfilled"
      ? ((completedApptsRes.value as { data: unknown[] | null }).data ?? [])
      : [];
  const memory =
    memoryRes.status === "fulfilled" ? ((memoryRes.value as { data: unknown[] | null }).data ?? []) : [];
  const befunde =
    befundeRes.status === "fulfilled" ? ((befundeRes.value as { data: unknown[] | null }).data ?? []) : [];
  const ordersCount =
    ordersRes.status === "fulfilled" ? ((ordersRes.value as { count: number | null }).count ?? 0) : 0;
  const permissions =
    permissionsRes.status === "fulfilled"
      ? ((permissionsRes.value as { data: unknown[] | null }).data ?? [])
      : [];

  // Deduplicate overdue horses by horse_id
  const seen = new Set<string>();
  const overdueHorses: HufiHorse[] = [];
  for (const raw of completedAppts as Array<{ horse_id: string; date: string; horses: unknown }>) {
    if (seen.has(raw.horse_id) || overdueHorses.length >= 5) continue;
    seen.add(raw.horse_id);
    const name =
      Array.isArray(raw.horses)
        ? (raw.horses[0] as { name?: string })?.name
        : (raw.horses as { name?: string } | null)?.name;
    if (!name) continue;
    overdueHorses.push({
      id: raw.horse_id,
      name,
      last_appointment_date: raw.date,
      weeks_overdue: Math.floor((Date.now() - new Date(raw.date).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    });
  }

  const todayAppointments: HufiAppointment[] = (
    rawAppts as Array<{ id: string; date: string; time: string | null; status: string; horses: unknown; client: unknown }>
  ).map((a) => ({
    id: a.id,
    date: a.date,
    time: a.time,
    status: a.status,
    horse_name: Array.isArray(a.horses)
      ? (a.horses[0] as { name?: string })?.name
      : (a.horses as { name?: string } | null)?.name,
    client_name: (a.client as { full_name?: string } | null)?.full_name,
  }));

  return {
    user: {
      id: userId,
      name: profile?.full_name ?? null,  // greeting fallback handled in generateHufiGreeting
      role,
      userType: (profile?.user_type as "pro" | "owner" | null) ?? null,
    },
    todayAppointments,
    openLeads: leadsCount,
    unpaidInvoices: invoicesCount,
    overdueHorses,
    memory: memory as HufiMemory[],
    lastBefunde: befunde as HufiAiBefund[],
    openOrders: ordersCount,
    permissions: permissions as HufiPermission[],
  };
}

// ── generateHufiGreeting ──────────────────────────────────────────────────────

export async function generateHufiGreeting(ctx: HufiContext): Promise<string> {
  const h = new Date().getHours();
  const greet = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const firstName = ctx.user.name?.split(" ")[0] ?? null;
  const namePart = firstName ? ` ${firstName}` : "";
  const isB2C = ctx.user.role === "client" || ctx.user.userType === "owner";

  let msg = `${greet}${namePart}! 👋`;

  if (isB2C) {
    if (ctx.overdueHorses.length > 0) {
      const horse = ctx.overdueHorses[0];
      msg += `\n\n${horse.name} ist seit ${horse.weeks_overdue} Wochen ohne Hufpflege. Termin anfragen?`;
    } else if (ctx.todayAppointments.length > 0) {
      const first = ctx.todayAppointments[0];
      msg += `\n\nHeute ist ${first.horse_name ?? "dein Pferd"} dran`;
      if (first.time) msg += ` um ${first.time.slice(0, 5)} Uhr`;
      msg += ". Alles bereit?";
    } else {
      msg += "\n\nWas kann ich heute für dich und dein Pferd tun?";
    }
    return msg;
  }

  // B2B farrier/provider
  const { todayAppointments, openLeads, unpaidInvoices, overdueHorses, openOrders } = ctx;

  if (todayAppointments.length > 0) {
    const first = todayAppointments[0];
    msg += `\n\nHeute ${todayAppointments.length === 1 ? "1 Termin" : `${todayAppointments.length} Termine`}.`;
    if (first.horse_name) {
      msg += ` Erster: ${first.horse_name}`;
      if (first.client_name) msg += ` bei ${first.client_name}`;
      if (first.time) msg += ` um ${first.time.slice(0, 5)}`;
      msg += ".";
    }

    if (first.time) {
      const [hh, mm] = first.time.split(":").map(Number);
      const apptDate = new Date();
      apptDate.setHours(hh, mm, 0, 0);
      const diffMin = Math.round((apptDate.getTime() - Date.now()) / 60000);
      if (diffMin > 0 && diffMin <= 30) msg += ` ⚡ Noch ${diffMin} Min!`;
      else if (diffMin <= 0 && diffMin > -90) msg += " ⏰ Läuft gerade!";
    }

    msg += "\n\nSoll ich die Route starten?";
  } else {
    msg += "\n\nHeute keine Termine geplant. 🎉";
  }

  const alerts: string[] = [];
  if (openLeads > 0) alerts.push(`📩 ${openLeads} neue ${openLeads === 1 ? "Anfrage" : "Anfragen"}`);
  if (unpaidInvoices > 0)
    alerts.push(`🧾 ${unpaidInvoices} unbezahlte ${unpaidInvoices === 1 ? "Rechnung" : "Rechnungen"}`);
  if (openOrders > 0)
    alerts.push(`📋 ${openOrders} offene ${openOrders === 1 ? "Auftrag" : "Aufträge"}`);
  if (overdueHorses.length > 0) {
    const names = overdueHorses.slice(0, 3).map((hh) => hh.name).join(", ");
    alerts.push(`⏳ Überfällig: ${names}`);
  }

  // Active memory alerts
  for (const mem of ctx.memory.filter((m) => m.category === "alert").slice(0, 2)) {
    if ((mem.value as { active?: boolean; message?: string }).active) {
      alerts.push(`🔔 ${(mem.value as { message?: string }).message}`);
    }
  }

  if (alerts.length > 0) msg += "\n\n" + alerts.join("\n");
  return msg;
}

// ── buildContextActions ───────────────────────────────────────────────────────

export function buildContextActions(
  ctx: HufiContext,
): Array<{ label: string; route: string }> {
  const actions: Array<{ label: string; route: string }> = [];
  if (ctx.todayAppointments.length > 0) {
    actions.push({ label: "🚀 Cockpit starten", route: "/cockpit" });
    actions.push({ label: "🗺️ Route", route: "/tour" });
    actions.push({ label: "📅 Termine", route: "/kalender" });
  }
  if (ctx.openLeads > 0) actions.push({ label: "📩 Anfragen", route: "/anfragen" });
  if (ctx.unpaidInvoices > 0) actions.push({ label: "🧾 Rechnungen", route: "/rechnungen" });
  if (ctx.overdueHorses.length > 0) actions.push({ label: "⏳ Pferde planen", route: "/kalender" });
  return actions;
}

// ── updateHufiMemory ──────────────────────────────────────────────────────────

export async function updateHufiMemory(
  userId: string,
  category: HufiMemory["category"],
  key: string,
  value: Record<string, unknown>,
  source: HufiMemory["source"],
): Promise<void> {
  try {
    const from = (table: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

    const { data: existing } = await from("hufi_memory")
      .select("id, confidence")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("key", key)
      .maybeSingle() as { data: { id: string; confidence: number } | null };

    if (existing) {
      const newConfidence = Math.min(0.95, existing.confidence + 0.05);
      await from("hufi_memory")
        .update({
          value,
          confidence: newConfidence,
          last_updated: new Date().toISOString(),
          source,
        })
        .eq("id", existing.id);
    } else {
      await from("hufi_memory").insert({
        user_id: userId,
        category,
        key,
        value,
        source,
        confidence: 0.5,
        last_updated: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[HufiBrain] updateHufiMemory failed (table may not exist yet):", err);
  }
}

// ── learnFromInteraction ──────────────────────────────────────────────────────

export async function learnFromInteraction(
  userId: string,
  userMessage: string,
  hufiResponse: string,
  feedback: "confirmed" | "corrected" | "ignored",
  sessionId?: string,
): Promise<void> {
  try {
    const from = (table: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

    await from("hufi_context_log").insert({
      user_id: userId,
      session_id: sessionId ?? crypto.randomUUID(),
      trigger: "voice",
      context_snapshot: {
        userMessage: userMessage.slice(0, 500),
        hufiResponse: hufiResponse.slice(0, 500),
      },
      action_taken: hufiResponse.slice(0, 200),
      user_feedback: feedback,
    });

    if (feedback === "confirmed") {
      // Track horse mentions for pattern learning
      const horseMatch = userMessage.match(
        /\b([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\b/,
      );
      if (horseMatch) {
        await updateHufiMemory(
          userId,
          "horse_pattern",
          `mention_${horseMatch[1].toLowerCase()}`,
          {
            horse_name: horseMatch[1],
            last_mentioned: new Date().toISOString(),
            interaction_count: 1,
          },
          "voice",
        );
      }
    }
  } catch (err) {
    console.warn("[HufiBrain] learnFromInteraction failed:", err);
  }
}

// ── checkProactiveAlerts ──────────────────────────────────────────────────────

export async function checkProactiveAlerts(userId: string): Promise<string[]> {
  const alerts: string[] = [];
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    // Appointment starting in next 30 minutes
    const now = new Date();
    const timeNow = format(now, "HH:mm:ss");
    const timePlus30 = format(new Date(now.getTime() + 30 * 60 * 1000), "HH:mm:ss");

    const { data: upcoming } = await supabase
      .from("appointments")
      .select("time, horses(name), client:profiles!client_id(full_name)")
      .eq("provider_id", userId)
      .eq("date", today)
      .in("status", ["scheduled", "confirmed"])
      .gte("time", timeNow)
      .lte("time", timePlus30)
      .limit(1);

    if (upcoming && upcoming.length > 0) {
      const appt = upcoming[0] as { time: string; horses: unknown; client: unknown };
      const horseName =
        Array.isArray(appt.horses)
          ? (appt.horses[0] as { name?: string })?.name
          : (appt.horses as { name?: string } | null)?.name;
      const clientName = (appt.client as { full_name?: string } | null)?.full_name;
      const [hh, mm] = appt.time.split(":").map(Number);
      const apptDate = new Date();
      apptDate.setHours(hh, mm, 0, 0);
      const diffMin = Math.max(1, Math.round((apptDate.getTime() - now.getTime()) / 60000));
      alerts.push(
        `⚡ ${horseName ?? "Nächster Termin"}${clientName ? ` bei ${clientName}` : ""} startet in ${diffMin} ${diffMin === 1 ? "Minute" : "Minuten"}!`,
      );
    }

    // Active memory alerts
    const from = (table: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

    const { data: memAlerts } = (await from("hufi_memory")
      .select("key, value")
      .eq("user_id", userId)
      .eq("category", "alert")
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)) as {
      data: Array<{ key: string; value: Record<string, unknown> }> | null;
    };

    for (const alert of (memAlerts ?? []).slice(0, 3)) {
      if (alert.value?.active && alert.value?.message) {
        alerts.push(`🔔 ${alert.value.message as string}`);
      }
    }
  } catch {
    // Non-critical — silently skip
  }

  return alerts;
}

// ── DSGVO ─────────────────────────────────────────────────────────────────────

const DSGVO_LS_KEY = "hufi-dsgvo-consent";

export async function checkDsgvoConsent(userId: string): Promise<boolean> {
  // Fast path — localStorage
  const local = localStorage.getItem(DSGVO_LS_KEY);
  if (local === "granted") return true;
  if (local === "denied") return false;

  // DB lookup
  try {
    const from = (table: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

    const { data } = (await from("hufi_memory")
      .select("value")
      .eq("user_id", userId)
      .eq("category", "dsgvo")
      .eq("key", "consent_given")
      .maybeSingle()) as { data: { value: Record<string, unknown> } | null };

    if (data?.value?.granted === true) {
      localStorage.setItem(DSGVO_LS_KEY, "granted");
      return true;
    }
    if (data?.value?.granted === false) {
      localStorage.setItem(DSGVO_LS_KEY, "denied");
      return false;
    }
  } catch {
    // Table doesn't exist yet — treat as first visit
  }

  return false;
}

export async function logDsgvoConsent(
  userId: string,
  purpose: string,
  granted: boolean,
): Promise<void> {
  localStorage.setItem(DSGVO_LS_KEY, granted ? "granted" : "denied");
  await updateHufiMemory(
    userId,
    "dsgvo",
    "consent_given",
    { granted, purpose, timestamp: new Date().toISOString(), version: "1.0" },
    "manual",
  );
}

// ── LAYER 2: ROLLEN-INTELLIGENZ ───────────────────────────────────────────────

export interface RoleProactiveMessage {
  text: string;
  urgency: "low" | "medium" | "high";
  action?: { label: string; route: string };
  reason: string; // EU AI Act transparency — always explain WHY
}

export interface RoleIntelligence {
  roleLabel: string;
  priorities: string[];
  proactiveMessages: RoleProactiveMessage[];
}

export function getRoleIntelligence(ctx: HufiContext): RoleIntelligence {
  const { user, todayAppointments, openLeads, unpaidInvoices, overdueHorses, openOrders, lastBefunde } = ctx;
  const role = user.role ?? "provider";
  const isB2C = role === "client" || user.userType === "owner";
  const isEmployee = role === "employee";
  const isPartner = role === "partner";

  if (isB2C) {
    const messages: RoleProactiveMessage[] = [];
    for (const horse of overdueHorses.slice(0, 2)) {
      messages.push({
        text: `${horse.name} war vor ${horse.weeks_overdue} Wochen beim Hufpfleger — Termin anfragen?`,
        urgency: (horse.weeks_overdue ?? 0) > 10 ? "high" : "medium",
        action: { label: "Termin anfragen", route: "/kalender" },
        reason: `Letzter dokumentierter Termin: ${horse.last_appointment_date ?? "unbekannt"}`,
      });
    }
    if (lastBefunde.length > 0 && lastBefunde[0].pferd_name) {
      messages.push({
        text: `Neuer Befund für ${lastBefunde[0].pferd_name} verfügbar — ansehen?`,
        urgency: "medium",
        action: { label: "Befund öffnen", route: "/archiv" },
        reason: "Ein Hufpfleger hat einen neuen Befund dokumentiert",
      });
    }
    return {
      roleLabel: "Pferdebesitzer",
      priorities: ["Pferd-Gesundheit", "Termine", "Dienstleister", "Dokumente"],
      proactiveMessages: messages,
    };
  }

  if (isEmployee) {
    const messages: RoleProactiveMessage[] = [];
    if (todayAppointments.length > 0) {
      const first = todayAppointments[0];
      const timeStr = first.time ? ` um ${first.time.slice(0, 5)}` : "";
      messages.push({
        text: `Heute ${todayAppointments.length} Pferde — erste Tour startet${timeStr}`,
        urgency: "medium",
        action: { label: "Tour starten", route: "/tour" },
        reason: "Basierend auf deinen heutigen Terminen",
      });
    }
    if (lastBefunde.filter((b) => !b.befund_text).length > 0) {
      messages.push({
        text: `${lastBefunde.length} Befunde noch nicht vollständig dokumentiert`,
        urgency: "low",
        action: { label: "Dokumentieren", route: "/archiv" },
        reason: "Befunde ohne Abschluss-Dokumentation gefunden",
      });
    }
    return {
      roleLabel: "Mitarbeiter",
      priorities: ["Heutige Aufgaben", "Tour", "Dokumentation"],
      proactiveMessages: messages,
    };
  }

  if (isPartner) {
    const messages: RoleProactiveMessage[] = [];
    if (lastBefunde.length > 0) {
      messages.push({
        text: `${lastBefunde.length} freigegebene ${lastBefunde.length === 1 ? "Befund" : "Befunde"} zur Ansicht`,
        urgency: "medium",
        action: { label: "Befunde öffnen", route: "/archiv" },
        reason: "Hufpfleger haben Befunde für dich freigegeben",
      });
    }
    return {
      roleLabel: "Partner (Tierarzt/Therapeut)",
      priorities: ["Freigegebene Befunde", "Anfragen", "Termine"],
      proactiveMessages: messages,
    };
  }

  // Default: B2B Hufschmied/Provider
  const messages: RoleProactiveMessage[] = [];
  if (todayAppointments.length > 0) {
    messages.push({
      text: `Heute ${todayAppointments.length} ${todayAppointments.length === 1 ? "Tour" : "Touren"} — Route optimieren?`,
      urgency: "medium",
      action: { label: "Route optimieren", route: "/tour" },
      reason: `${todayAppointments.length} Termine für heute geplant`,
    });
  }
  if (unpaidInvoices > 0) {
    messages.push({
      text: `${unpaidInvoices} unbezahlte ${unpaidInvoices === 1 ? "Rechnung" : "Rechnungen"} offen`,
      urgency: unpaidInvoices > 3 ? "high" : "medium",
      action: { label: "Rechnungen", route: "/rechnungen" },
      reason: `${unpaidInvoices} Rechnungen ohne Zahlungseingang`,
    });
  }
  if (openLeads > 0) {
    const dringend = openLeads > 2 ? " — davon 2 dringend" : "";
    messages.push({
      text: `${openLeads} neue ${openLeads === 1 ? "Anfrage" : "Anfragen"}${dringend}`,
      urgency: openLeads > 3 ? "high" : "low",
      action: { label: "Anfragen öffnen", route: "/anfragen" },
      reason: "Neue Kundenanfragen warten auf Bearbeitung",
    });
  }
  if (overdueHorses.length > 0) {
    const names = overdueHorses.slice(0, 2).map((h) => h.name).join(", ");
    messages.push({
      text: `Überfällige Pferde: ${names} — Termine planen?`,
      urgency: "low",
      action: { label: "Termine planen", route: "/kalender" },
      reason: "Diese Pferde hatten seit >8 Wochen keinen Termin",
    });
  }
  if (openOrders > 0) {
    messages.push({
      text: `${openOrders} offene ${openOrders === 1 ? "Auftrag" : "Aufträge"} in Bearbeitung`,
      urgency: "low",
      action: { label: "Aufträge", route: "/auftraege" },
      reason: `${openOrders} Serviceaufträge noch nicht abgeschlossen`,
    });
  }
  return {
    roleLabel: "Hufschmied (B2B)",
    priorities: ["Termine", "Rechnungen", "Anfragen", "Kunden", "Finanzen"],
    proactiveMessages: messages,
  };
}

// ── HORSE WELFARE LAYER ───────────────────────────────────────────────────────

export interface WelfareAlert {
  keyword: string;
  severity: "warning" | "emergency";
  message: string;
  callToAction: string;
}

const WELFARE_KEYWORDS: Array<{ word: string; severity: "warning" | "emergency" }> = [
  { word: "kolik",             severity: "emergency" },
  { word: "kollabiert",        severity: "emergency" },
  { word: "notfall",           severity: "emergency" },
  { word: "blutung",           severity: "emergency" },
  { word: "bricht zusammen",   severity: "emergency" },
  { word: "kann nicht aufstehen", severity: "emergency" },
  { word: "blut",              severity: "emergency" },
  { word: "frisst nicht",      severity: "warning" },
  { word: "trinkt nicht",      severity: "warning" },
  { word: "lahmheit",          severity: "warning" },
  { word: "lahmt",             severity: "warning" },
  { word: "schmerz",           severity: "warning" },
  { word: "verletzung",        severity: "warning" },
  { word: "schwellung",        severity: "warning" },
  { word: "fieber",            severity: "warning" },
  { word: "zittert",           severity: "warning" },
  { word: "liegt nur",         severity: "warning" },
];

export function checkHorseWelfare(text: string): WelfareAlert | null {
  const lower = text.toLowerCase();
  for (const { word, severity } of WELFARE_KEYWORDS) {
    if (lower.includes(word)) {
      if (severity === "emergency") {
        return {
          keyword: word,
          severity: "emergency",
          message: `🚨 Das klingt nach einem Notfall!\n\nBitte kontaktiere sofort deinen Tierarzt. Jede Minute zählt bei Kolik oder anderen Notfällen.\n\nHufi hat den Vorfall geloggt.`,
          callToAction: "Tierarzt finden",
        };
      }
      return {
        keyword: word,
        severity: "warning",
        message: `⚠️ Das klingt nach einem Gesundheitsproblem (${word}).\n\nBeobachte dein Pferd genau. Bei Verschlechterung sofort den Tierarzt kontaktieren.\n\nHufi hat die Meldung gespeichert.`,
        callToAction: "Tierarzt finden",
      };
    }
  }
  return null;
}

export async function logWelfareAlert(userId: string, alert: WelfareAlert, context: string): Promise<void> {
  await updateHufiMemory(
    userId,
    "alert",
    `welfare_${Date.now()}`,
    {
      active: true,
      message: alert.message,
      severity: alert.severity,
      keyword: alert.keyword,
      context: context.slice(0, 200),
      timestamp: new Date().toISOString(),
    },
    "system",
  );
}

// ── BERECHTIGUNGS-SYSTEM ──────────────────────────────────────────────────────

const LEVEL_ORDER: Record<string, number> = { read: 1, write: 2, full: 3 };

export async function checkPermission(
  requesterId: string,
  resourceType: string,
  resourceId: string,
  requiredLevel: "read" | "write" | "full",
): Promise<boolean> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const { data } = (await from("hufi_permissions")
      .select("permission_level")
      .eq("grantee_id", requesterId)
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .eq("dsgvo_consent", true)
      .is("revoked_at", null)
      .maybeSingle()) as { data: { permission_level: string } | null };

    if (!data) return false;
    return (LEVEL_ORDER[data.permission_level] ?? 0) >= LEVEL_ORDER[requiredLevel];
  } catch {
    return false;
  }
}

export async function requestPermission(
  grantorId: string,
  granteeId: string,
  resourceType: string,
  purpose: string,
): Promise<void> {
  try {
    await updateHufiMemory(
      grantorId,
      "alert",
      `permission_req_${granteeId}_${resourceType}`,
      {
        active: true,
        message: `Berechtigungsanfrage für "${resourceType}" — Freigabe erteilen?`,
        grantee_id: granteeId,
        resource_type: resourceType,
        purpose,
        requested_at: new Date().toISOString(),
      },
      "system",
    );
  } catch (err) {
    console.warn("[HufiBrain] requestPermission failed:", err);
  }
}

// ── LAYER 3: PFERDEAKTE HUB ───────────────────────────────────────────────────

export interface PferdeakteEntry {
  id: string;
  date: string;
  type: "appointment" | "befund" | "document" | "medication";
  summary: string;
  provider?: string;
}

export interface PferdeakteHub {
  horse: {
    id: string;
    name: string;
    breed: string | null;
    birthYear: number | null;
    hoofType: string | null;
    shoeingStatus: string | null;
    shoeingIntervalWeeks: number | null;
    healthStatus: string | null;
    currentMedications: string | null;
    specialNotes: string | null;
    photoUrl: string | null;
  };
  lastAppointment: { date: string; provider?: string } | null;
  recentBefunde: HufiAiBefund[];
  history: PferdeakteEntry[];
  daysSinceLastService: number | null;
  needsServiceCheck: boolean;
  sharedWith: string[];
}

export async function fetchPferdeakteHub(
  horseId: string,
  requesterId: string,
): Promise<PferdeakteHub | null> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const { data: horse } = await supabase
      .from("horses")
      .select(
        "id, name, breed, birth_year, hoof_type, shoeing_status, shoeing_interval, health_status, current_medications, special_notes, photo_url, owner_id, last_appointment_date",
      )
      .eq("id", horseId)
      .maybeSingle();

    if (!horse) return null;
    if ((horse as { owner_id: string }).owner_id !== requesterId) {
      const hasAccess = await checkPermission(requesterId, "horse", horseId, "read");
      if (!hasAccess) return null;
    }

    const [apptsRes, befundeRes, permRes] = await Promise.allSettled([
      supabase
        .from("appointments")
        .select("id, date, status, provider:profiles!provider_id(full_name)")
        .eq("horse_id" as never, horseId)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(10),
      from("ai_befunde")
        .select("id, created_at, pferd_name, befund_text, massnahme, naechster_termin")
        .eq("horse_id" as never, horseId)
        .order("created_at", { ascending: false })
        .limit(5),
      from("hufi_permissions")
        .select("grantee_id")
        .eq("resource_type", "horse")
        .eq("resource_id", horseId)
        .is("revoked_at", null),
    ]);

    const appts =
      apptsRes.status === "fulfilled"
        ? ((apptsRes.value as { data: unknown[] | null }).data ?? [])
        : [];
    const befunde =
      befundeRes.status === "fulfilled"
        ? ((befundeRes.value as { data: unknown[] | null }).data ?? [])
        : [];
    const perms =
      permRes.status === "fulfilled"
        ? ((permRes.value as { data: unknown[] | null }).data ?? [])
        : [];

    const lastApptRaw = (appts as Array<{ date: string; provider: unknown }>)[0];
    const lastAppt = lastApptRaw
      ? {
          date: lastApptRaw.date,
          provider: (lastApptRaw.provider as { full_name?: string } | null)?.full_name,
        }
      : (horse as { last_appointment_date: string | null }).last_appointment_date
        ? { date: (horse as { last_appointment_date: string }).last_appointment_date }
        : null;

    const daysSince = lastAppt?.date
      ? Math.floor((Date.now() - new Date(lastAppt.date).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const h = horse as { shoeing_interval: number | null };
    const intervalDays = h.shoeing_interval ? h.shoeing_interval * 7 : 56;
    const needsServiceCheck = daysSince !== null && daysSince >= intervalDays - 7;

    const history: PferdeakteEntry[] = (
      appts as Array<{ id: string; date: string; provider: unknown }>
    ).map((a) => ({
      id: a.id,
      date: a.date,
      type: "appointment" as const,
      summary: "Termin abgeschlossen",
      provider: (a.provider as { full_name?: string } | null)?.full_name,
    }));

    const h2 = horse as {
      id: string; name: string; breed: string | null; birth_year: number | null;
      hoof_type: string | null; shoeing_status: string | null; shoeing_interval: number | null;
      health_status: string | null; current_medications: string | null;
      special_notes: string | null; photo_url: string | null;
    };

    return {
      horse: {
        id: h2.id,
        name: h2.name,
        breed: h2.breed,
        birthYear: h2.birth_year,
        hoofType: h2.hoof_type,
        shoeingStatus: h2.shoeing_status,
        shoeingIntervalWeeks: h2.shoeing_interval,
        healthStatus: h2.health_status,
        currentMedications: h2.current_medications,
        specialNotes: h2.special_notes,
        photoUrl: h2.photo_url,
      },
      lastAppointment: lastAppt,
      recentBefunde: befunde as HufiAiBefund[],
      history,
      daysSinceLastService: daysSince,
      needsServiceCheck,
      sharedWith: (perms as Array<{ grantee_id: string }>).map((p) => p.grantee_id),
    };
  } catch (err) {
    console.warn("[HufiBrain] fetchPferdeakteHub failed:", err);
    return null;
  }
}

export async function check30DayServiceCheck(
  userId: string,
): Promise<Array<{ horseId: string; horseName: string; daysSince: number; ownerName?: string }>> {
  try {
    const thirtyDaysAgo = format(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );

    const { data } = await supabase
      .from("horses")
      .select("id, name, last_appointment_date, owner:profiles!owner_id(full_name)")
      .eq("owner_id" as never, userId)
      .or(`last_appointment_date.is.null,last_appointment_date.lt.${thirtyDaysAgo}`)
      .eq("horse_status", "active")
      .limit(10);

    if (!data) return [];

    return (data as Array<{ id: string; name: string; last_appointment_date: string | null; owner: unknown }>)
      .map((hh) => ({
        horseId: hh.id,
        horseName: hh.name,
        daysSince: hh.last_appointment_date
          ? Math.floor((Date.now() - new Date(hh.last_appointment_date).getTime()) / (24 * 60 * 60 * 1000))
          : 999,
        ownerName: (hh.owner as { full_name?: string } | null)?.full_name,
      }))
      .sort((a, b) => b.daysSince - a.daysSince);
  } catch {
    return [];
  }
}

// ── notifyColleague ───────────────────────────────────────────────────────────

export async function notifyColleague(
  senderId: string,
  recipientId: string,
  subject: string,
  message: string,
  resourceType: "horse" | "invoice" | "befund" | "calendar",
  resourceId: string,
): Promise<boolean> {
  try {
    const hasPerm = await checkPermission(senderId, resourceType, resourceId, "read");
    if (!hasPerm && senderId !== resourceId) {
      await requestPermission(senderId, recipientId, resourceType, message);
      return false;
    }

    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    await from("hufi_context_log").insert({
      user_id: senderId,
      session_id: crypto.randomUUID(),
      trigger: "manual",
      context_snapshot: { recipientId, subject, resourceType, resourceId },
      action_taken: `notify_colleague: ${subject}`,
      explanation: `Kollege ${recipientId} über ${resourceType} informiert. Betreff: ${subject}`,
    });

    await updateHufiMemory(
      recipientId,
      "alert",
      `colleague_msg_${Date.now()}`,
      {
        active: true,
        message: `📩 Nachricht von Kollege: ${subject}\n${message.slice(0, 200)}`,
        sender_id: senderId,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp: new Date().toISOString(),
      },
      "system",
    );

    return true;
  } catch (err) {
    console.warn("[HufiBrain] notifyColleague failed:", err);
    return false;
  }
}
