import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriggerType = "daily_time" | "weekly" | "interval_days" | "event";
export type ActionType = "notification" | "ai_briefing" | "data_write" | "hufi_message";

export interface TriggerConfig {
  time?: string;         // "07:00"
  weekday?: number;      // 0=Montag … 6=Sonntag
  days?: number;
  reference?: string;
  event_type?: string;
  offset_minutes?: number;
}

export interface ActionConfig {
  title?: string;
  message?: string;
  route?: string;
  prompt?: string;
  include_appointments?: boolean;
  include_invoices?: boolean;
  task_type?: string;
  payload?: Record<string, unknown>;
}

export interface HufiRoutine {
  id: string;
  user_id: string;
  label: string;
  description?: string;
  enabled: boolean;
  template_key?: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  action_type: ActionType;
  action_config: ActionConfig;
  icon: string;
  color: string;
  last_triggered_at?: string;
  next_trigger_at?: string;
  trigger_count: number;
  created_at: string;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export interface RoutineTemplate {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  role?: "provider" | "client" | "employee" | "all";
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  action_type: ActionType;
  action_config: ActionConfig;
  editableFields: string[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    key: "morning_briefing",
    label: "Morgen-Briefing",
    description: "Täglich ein KI-Überblick: Termine, Wetter, offene Rechnungen.",
    icon: "🌅",
    color: "#F97316",
    role: "provider",
    trigger_type: "daily_time",
    trigger_config: { time: "07:00" },
    action_type: "ai_briefing",
    action_config: {
      prompt: "Erstelle ein kurzes Morgen-Briefing mit heutigen Terminen, offenen Rechnungen und einem Wetterhinweis.",
      include_appointments: true,
      include_invoices: true,
    },
    editableFields: ["time"],
  },
  {
    key: "evening_summary",
    label: "Abend-Zusammenfassung",
    description: "Tagesabschluss: Was wurde erledigt, was bleibt offen.",
    icon: "🌙",
    color: "#8B5CF6",
    role: "provider",
    trigger_type: "daily_time",
    trigger_config: { time: "19:30" },
    action_type: "ai_briefing",
    action_config: {
      prompt: "Erstelle eine kurze Abend-Zusammenfassung: erledigte Termine, offene Aufgaben für morgen.",
      include_appointments: true,
      include_invoices: true,
    },
    editableFields: ["time"],
  },
  {
    key: "invoice_followup",
    label: "Rechnungs-Follow-up",
    description: "Erinnerung wenn eine Rechnung X Tage unbezahlt ist.",
    icon: "📋",
    color: "#EF4444",
    role: "provider",
    trigger_type: "interval_days",
    trigger_config: { days: 14, reference: "invoice_created" },
    action_type: "notification",
    action_config: {
      title: "Offene Rechnung",
      message: "Eine Rechnung ist seit 14 Tagen unbezahlt.",
      route: "/rechnungen",
    },
    editableFields: ["days"],
  },
  {
    key: "welfare_alert",
    label: "Welfare-Alert",
    description: "Hinweis wenn ein Pferd seinen Pflege-Intervall überschreitet.",
    icon: "🐴",
    color: "#10B981",
    role: "provider",
    trigger_type: "interval_days",
    trigger_config: { days: 42, reference: "last_appointment" },
    action_type: "hufi_message",
    action_config: {
      message: "Ein Pferd aus deiner Kundschaft hat seinen Pflege-Intervall überschritten.",
    },
    editableFields: ["days"],
  },
  {
    key: "appointment_reminder",
    label: "Termin-Erinnerung",
    description: "2 Stunden vor jedem Termin eine Erinnerung.",
    icon: "📅",
    color: "#3B82F6",
    role: "all",
    trigger_type: "event",
    trigger_config: { event_type: "appointment", offset_minutes: -120 },
    action_type: "notification",
    action_config: {
      title: "Termin in 2 Stunden",
      message: "Gleich geht es los.",
      route: "/kalender",
    },
    editableFields: ["offset_minutes"],
  },
  {
    key: "tour_start",
    label: "Tour-Start-Reminder",
    description: "30 Minuten vor dem ersten Termin des Tages.",
    icon: "🗺️",
    color: "#F59E0B",
    role: "employee",
    trigger_type: "event",
    trigger_config: { event_type: "first_appointment_of_day", offset_minutes: -30 },
    action_type: "notification",
    action_config: {
      title: "Tour startet gleich",
      message: "Dein erster Termin ist in 30 Minuten.",
      route: "/employee/tour",
    },
    editableFields: [],
  },
  {
    key: "monthly_report",
    label: "Monats-Report",
    description: "Am 1. jeden Monats eine KI-Übersicht deiner Zahlen.",
    icon: "📊",
    color: "#6366F1",
    role: "provider",
    trigger_type: "daily_time",
    trigger_config: { time: "08:00" },
    action_type: "ai_briefing",
    action_config: {
      prompt: "Erstelle einen Monatsbericht: Umsatz, Anzahl Termine, offene Rechnungen, erkennbare Trends.",
      include_appointments: true,
      include_invoices: true,
    },
    editableFields: ["time"],
  },
  {
    key: "client_huf_interval",
    label: "Huf-Intervall (Kunde)",
    description: "Erinnerung für Pferdebesitzer wenn der nächste Termin fällig ist.",
    icon: "🔔",
    color: "#EC4899",
    role: "client",
    trigger_type: "interval_days",
    trigger_config: { days: 42, reference: "last_appointment" },
    action_type: "notification",
    action_config: {
      title: "Hufpflege fällig",
      message: "Ihr Pferd ist wieder für die Hufpflege fällig.",
      route: "/client-booking",
    },
    editableFields: ["days"],
  },
];

// ── Next trigger calculation ──────────────────────────────────────────────────

export function computeNextTrigger(type: TriggerType, config: TriggerConfig): Date | null {
  const now = new Date();

  if (type === "daily_time" && config.time) {
    const [h, m] = config.time.split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  if (type === "weekly" && config.time) {
    const [h, m] = config.time.split(":").map(Number);
    const targetDay = config.weekday ?? 0; // 0=Montag
    const jsDay = now.getDay(); // 0=Sonntag
    const moDay = jsDay === 0 ? 6 : jsDay - 1; // Monday-basiert
    let daysUntil = (targetDay - moDay + 7) % 7;
    const next = new Date(now);
    if (daysUntil === 0) {
      next.setHours(h, m, 0, 0);
      if (next <= now) daysUntil = 7;
    }
    next.setDate(next.getDate() + daysUntil);
    next.setHours(h, m, 0, 0);
    return next;
  }

  if (type === "interval_days" && config.days) {
    const next = new Date(now);
    next.setDate(next.getDate() + config.days);
    return next;
  }

  return null; // event-basiert: wird extern ausgelöst
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getRoutines(userId: string): Promise<HufiRoutine[]> {
  const { data, error } = await supabase
    .from("hufi_routines")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HufiRoutine[];
}

export async function createRoutine(
  userId: string,
  routine: Omit<HufiRoutine, "id" | "user_id" | "created_at" | "last_triggered_at" | "trigger_count">,
): Promise<HufiRoutine> {
  const nextTrigger = computeNextTrigger(routine.trigger_type, routine.trigger_config);
  const { data, error } = await supabase
    .from("hufi_routines")
    .insert({ ...routine, user_id: userId, next_trigger_at: nextTrigger?.toISOString() ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as HufiRoutine;
}

export async function updateRoutine(
  id: string,
  changes: Partial<Omit<HufiRoutine, "id" | "user_id" | "created_at">>,
): Promise<void> {
  if (changes.trigger_type !== undefined || changes.trigger_config !== undefined) {
    const type = changes.trigger_type ?? "daily_time";
    const config = changes.trigger_config ?? {};
    const next = computeNextTrigger(type, config);
    if (next) (changes as Record<string, unknown>).next_trigger_at = next.toISOString();
  }
  const { error } = await supabase.from("hufi_routines").update(changes).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from("hufi_routines").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleRoutine(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("hufi_routines").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export function templateToRoutine(
  t: RoutineTemplate,
): Omit<HufiRoutine, "id" | "user_id" | "created_at" | "last_triggered_at" | "trigger_count"> {
  return {
    label: t.label,
    description: t.description,
    enabled: true,
    template_key: t.key,
    trigger_type: t.trigger_type,
    trigger_config: { ...t.trigger_config },
    action_type: t.action_type,
    action_config: { ...t.action_config },
    icon: t.icon,
    color: t.color,
  };
}

// ── Free-text interpretation via Hufi AI ─────────────────────────────────────

export async function interpretRoutineText(text: string): Promise<Partial<HufiRoutine> | null> {
  try {
    const { data: fnData, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        messages: [
          {
            role: "system",
            content: `Du wandelst Nutzer-Anfragen in strukturierte Hufi-Routinen um.
Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärung):
{
  "label": "kurzer Name (max 30 Zeichen)",
  "description": "ein Satz Beschreibung",
  "icon": "passendes Emoji",
  "color": "#HexFarbe",
  "trigger_type": "daily_time|weekly|interval_days|event",
  "trigger_config": Objekt je nach Typ:
    daily_time: {"time":"HH:MM"}
    weekly: {"weekday":0-6,"time":"HH:MM"} (0=Mo, 6=So)
    interval_days: {"days":Zahl}
    event: {"event_type":"appointment","offset_minutes":-120},
  "action_type": "notification|ai_briefing|hufi_message",
  "action_config": {"title":"...","message":"...","route":"/pfad-optional"}
}
Bei action_type "ai_briefing" nutze "action_config": {"prompt":"was Hufi analysieren soll"}.`,
          },
          { role: "user", content: text },
        ],
        stream: false,
      },
    });
    if (error || !fnData) return null;
    const content: string = fnData.content ?? fnData.choices?.[0]?.message?.content ?? "";
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as Partial<HufiRoutine>;
  } catch {
    return null;
  }
}

// ── Human-readable descriptions ───────────────────────────────────────────────

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function describeTrigger(type: TriggerType, config: TriggerConfig): string {
  if (type === "daily_time") return `tägl. ${config.time ?? "?"}`;
  if (type === "weekly") return `jeden ${WEEKDAYS[config.weekday ?? 0]} ${config.time ?? ""}`.trim();
  if (type === "interval_days") return `alle ${config.days} Tage`;
  if (type === "event") {
    const label = config.event_type === "appointment" ? "vor Termin"
      : config.event_type === "first_appointment_of_day" ? "vor erster Station"
      : config.event_type ?? "Event";
    if (config.offset_minutes) {
      const h = Math.abs(Math.floor(config.offset_minutes / 60));
      return `${h}h ${label}`;
    }
    return label;
  }
  return "";
}

export function describeAction(type: ActionType): string {
  if (type === "notification") return "Push";
  if (type === "ai_briefing") return "KI-Briefing";
  if (type === "hufi_message") return "Hufi-Chat";
  if (type === "data_write") return "Aktion";
  return "";
}
