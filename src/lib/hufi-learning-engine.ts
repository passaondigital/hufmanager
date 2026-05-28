import { supabase } from "@/integrations/supabase/client";
import { learnFromInteraction, updateHufiMemory } from "@/lib/hufi-brain";

export interface HufiSkill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  trigger_pattern: string;
  action_type: string;
  action_config: Record<string, unknown>;
  learned_from?: string;
  confidence: number;
  times_used: number;
  times_confirmed: number;
  times_rejected: number;
  active: boolean;
  suggested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ObservedPattern {
  pattern: string;
  occurrences: number;
  confidence: number;
  last_seen_at: string;
}

interface LearnMessage {
  role: "user" | "ai";
  text: string;
  ts: number;
}

export async function observeInteraction(
  userText: string,
  _response: string,
  userId: string,
  conversationId?: string,
): Promise<void> {
  try {
    // Pattern erkennen
    let observationType = "general";
    let pattern = "general";
    if (/rechnung|abrechnen/i.test(userText)) { observationType = "billing_intent"; pattern = "billing"; }
    else if (/termin|buchen|planen/i.test(userText)) { observationType = "scheduling_intent"; pattern = "scheduling"; }
    else if (/route|fahrt|tour/i.test(userText)) { observationType = "routing_intent"; pattern = "routing"; }
    else if (/wetter|regen|sturm/i.test(userText)) { observationType = "weather_concern"; pattern = "weather"; }
    else if (/erinnerung|erinnere|vergessen/i.test(userText)) { observationType = "reminder_intent"; pattern = "reminder"; }

    if (pattern === "general") return; // Nicht jede Nachricht speichern

    // Existiert schon?
    const { data: existing } = await supabase
      .from("hufi_observations")
      .select("id, occurrence_count")
      .eq("user_id", userId)
      .eq("pattern", pattern)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("hufi_observations")
        .update({
          occurrence_count: (existing as { id: string; occurrence_count: number }).occurrence_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", (existing as { id: string }).id)
        .eq("user_id", userId);
    } else {
      await supabase.from("hufi_observations").insert({
        user_id: userId,
        conversation_id: conversationId ?? null,
        observation_type: observationType,
        pattern,
        context: { sample: userText.slice(0, 100) },
        occurrence_count: 1,
      });
    }
  } catch {
    // Non-blocking
  }
}

export async function detectPatterns(userId: string): Promise<ObservedPattern[]> {
  const { data } = await supabase
    .from("hufi_observations")
    .select("pattern, occurrence_count, last_seen_at")
    .eq("user_id", userId)
    .order("occurrence_count", { ascending: false })
    .limit(10);

  return (data ?? []).map((row) => {
    const r = row as { pattern: string; occurrence_count: number; last_seen_at: string };
    return {
      pattern: r.pattern,
      occurrences: r.occurrence_count,
      confidence: Math.min(1, r.occurrence_count / 10),
      last_seen_at: r.last_seen_at,
    };
  });
}

const PATTERN_SKILL_TEMPLATES: Record<string, { name: string; description: string; trigger: string; action_type: string }> = {
  billing: {
    name: "Tagesabrechnung",
    description: "Rechnungen für heutige Termine automatisch vorbereiten",
    trigger: "rechnung|abrechnen|heute.*rechnung",
    action_type: "create_invoices_today",
  },
  scheduling: {
    name: "Terminplanung",
    description: "Termine schnell erfassen und optimieren",
    trigger: "termin|buchen|planen",
    action_type: "create_appointment",
  },
  routing: {
    name: "Routenoptimierung",
    description: "Tagesroute automatisch optimieren",
    trigger: "route|tagesroute|fahrt optimier",
    action_type: "plan_day_route",
  },
  weather: {
    name: "Schlechtwetter-Reaktion",
    description: "Kunden bei schlechtem Wetter automatisch informieren",
    trigger: "regen|sturm|schlechtes wetter",
    action_type: "rain_day_response",
  },
  reminder: {
    name: "Erinnerungsverwaltung",
    description: "Erinnerungen schnell setzen",
    trigger: "erinnerung|erinnere|vergessen",
    action_type: "set_reminder",
  },
};

export async function suggestSkill(
  userId: string,
  pattern: string,
  _context: Record<string, unknown> = {},
): Promise<void> {
  try {
    const template = PATTERN_SKILL_TEMPLATES[pattern];
    if (!template) return;

    // Existiert Skill schon?
    const { data: existing } = await supabase
      .from("hufi_skills")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", template.action_type)
      .maybeSingle();
    if (existing) return;

    const { data: skill } = await supabase
      .from("hufi_skills")
      .insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        trigger_pattern: template.trigger,
        action_type: template.action_type,
        action_config: {},
        learned_from: pattern,
        confidence: 0.3,
        active: false,
        suggested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!skill) return;

    // Proaktiver Hinweis in hufi_memory
    await updateHufiMemory(
      userId,
      "preference",
      `skill_suggestion_${template.action_type}`,
      {
        skill_id: (skill as { id: string }).id,
        message: `Ich habe bemerkt, dass du oft nach ${template.description} fragst. Soll ich das automatisch für dich vorbereiten?`,
        action_type: template.action_type,
        suggested_at: new Date().toISOString(),
      },
      "system",
    );
  } catch {
    // Non-blocking
  }
}

export async function matchSkills(
  userText: string,
  userId: string,
): Promise<(HufiSkill & { ask_first?: boolean }) | null> {
  const { data } = await supabase
    .from("hufi_skills")
    .select()
    .eq("user_id", userId)
    .eq("active", true)
    .order("confidence", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return null;

  for (const row of data) {
    const skill = row as unknown as HufiSkill;
    try {
      const rx = new RegExp(skill.trigger_pattern, "i");
      if (!rx.test(userText)) continue;
      if (skill.confidence > 0.7) return { ...skill, ask_first: false };
      if (skill.confidence >= 0.4) return { ...skill, ask_first: true };
    } catch {
      // Ungültiger RegExp — überspringen
    }
  }
  return null;
}

export async function confirmSkill(skillId: string, userId: string): Promise<void> {
  const { data } = await supabase
    .from("hufi_skills")
    .select("confidence, times_confirmed")
    .eq("id", skillId)
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const r = data as { confidence: number; times_confirmed: number };
  await supabase
    .from("hufi_skills")
    .update({
      active: true,
      confidence: Math.min(1, r.confidence + 0.2),
      times_confirmed: r.times_confirmed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", skillId)
    .eq("user_id", userId);
}

export async function processSkillFeedback(
  skillId: string,
  userId: string,
  confirmed: boolean,
): Promise<void> {
  const { data } = await supabase
    .from("hufi_skills")
    .select("confidence, times_confirmed, times_rejected")
    .eq("id", skillId)
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const r = data as { confidence: number; times_confirmed: number; times_rejected: number };

  if (confirmed) {
    await supabase
      .from("hufi_skills")
      .update({
        active: true,
        confidence: Math.min(1, r.confidence + 0.15),
        times_confirmed: r.times_confirmed + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skillId)
      .eq("user_id", userId);
  } else {
    const newRejected = r.times_rejected + 1;
    await supabase
      .from("hufi_skills")
      .update({
        confidence: Math.max(0, r.confidence - 0.2),
        times_rejected: newRejected,
        active: newRejected < 3,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skillId)
      .eq("user_id", userId);
  }
}

export async function learnFromSession(
  userId: string,
  conversationId: string | null,
  messages: LearnMessage[],
  completedTaskTypes: string[] = [],
): Promise<void> {
  try {
    // bestehende learnFromInteraction aufrufen
    const userMessages = messages.filter((m) => m.role === "user");
    const aiMessages = messages.filter((m) => m.role === "ai");
    if (userMessages.length > 0 && aiMessages.length > 0) {
      const lastUser = userMessages[userMessages.length - 1];
      const lastAi = aiMessages[aiMessages.length - 1];
      await learnFromInteraction(
        userId,
        lastUser.text,
        lastAi.text,
        "confirmed",
        conversationId ?? undefined,
      );
    }

    // Pattern aus completedTasks lernen
    for (const taskType of completedTaskTypes) {
      const pattern = taskTypeToPattern(taskType);
      if (!pattern) continue;
      // Observation hochzählen
      await observeInteraction(pattern, "", userId, conversationId ?? undefined);
      // Skill vorschlagen wenn nötig
      const patterns = await detectPatterns(userId);
      const p = patterns.find((p) => p.pattern === pattern);
      if (p && p.occurrences >= 3) {
        await suggestSkill(userId, pattern, {});
      }
    }
  } catch {
    // Non-blocking
  }
}

function taskTypeToPattern(taskType: string): string | null {
  const map: Record<string, string> = {
    create_invoices_today: "billing",
    create_invoice: "billing",
    create_appointment: "scheduling",
    plan_day_route: "routing",
    rain_day_response: "weather",
    set_reminder: "reminder",
  };
  return map[taskType] ?? null;
}
