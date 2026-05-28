import { supabase } from "@/integrations/supabase/client";

export type TaskStatus =
  | "pending" | "running" | "awaiting_confirm" | "done" | "failed" | "cancelled";

export interface TaskStep {
  id: string;
  tool: string;
  description: string;
  params: Record<string, unknown>;
  status: "pending" | "running" | "done" | "failed";
  result?: unknown;
  requires_confirm: boolean;
  confirmed_at?: string;
  error?: string;
}

export interface HufiTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  trigger_phrase?: string;
  status: TaskStatus;
  priority: number;
  steps: TaskStep[];
  current_step: number;
  context: Record<string, unknown>;
  result_summary?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  scheduled_for?: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  triggers: RegExp[];
  buildSteps: (context: Record<string, unknown>) => Omit<TaskStep, "id" | "status">[];
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "remind_overdue_clients",
    title: "Überfällige Kunden erinnern",
    description: "Kunden kontaktieren deren Pferd lange keinen Termin hatte",
    triggers: [/erinner.*(kunden|alle)/i, /überfällig/i, /wer.*lang.*nicht/i, /wer.*keinen.*termin/i],
    buildSteps: () => [
      { tool: "get_overdue_clients", description: "Überfällige Kunden laden", params: { days_overdue: 56 }, requires_confirm: false },
      { tool: "build_whatsapp_drafts", description: "WhatsApp-Nachrichten vorbereiten", params: { template: "appointment_reminder" }, requires_confirm: true },
    ],
  },
  {
    id: "create_invoices_today",
    title: "Rechnungen für heute erstellen",
    description: "Alle heutigen Termine abrechnen",
    triggers: [/rechnung.*(heute|alle)/i, /heute.*rechnung/i, /abrechnen/i],
    buildSteps: () => [
      { tool: "get_today_appointments", description: "Heutige Termine laden", params: {}, requires_confirm: false },
      { tool: "create_invoices_batch", description: "Rechnungen erstellen", params: {}, requires_confirm: true },
    ],
  },
  {
    id: "plan_day_route",
    title: "Tagesroute planen",
    description: "Route für heute oder morgen optimieren",
    triggers: [/route.*(heute|morgen)/i, /tagesroute/i, /optimier.*route/i, /route optimier/i],
    buildSteps: (ctx) => [
      { tool: "get_day_appointments", description: "Termine laden", params: { date: (ctx.date as string) ?? "today" }, requires_confirm: false },
      { tool: "optimize_route", description: "Route optimieren", params: {}, requires_confirm: false },
      { tool: "build_maps_link", description: "Maps-Link erstellen", params: {}, requires_confirm: false },
    ],
  },
  {
    id: "rain_day_response",
    title: "Schlechtwetter-Reaktion",
    description: "Kunden bei Regen oder Sturm informieren",
    triggers: [/es regnet/i, /regen.*(morgen|heute)/i, /schlechtes wetter/i, /sturm/i, /gewitter/i],
    buildSteps: () => [
      { tool: "get_weather_forecast", description: "Wetter prüfen", params: {}, requires_confirm: false },
      { tool: "get_outdoor_appointments", description: "Außentermine laden", params: {}, requires_confirm: false },
      { tool: "build_postpone_drafts", description: "Verschiebungs-Nachrichten vorbereiten", params: { channel: "whatsapp" }, requires_confirm: true },
    ],
  },
  {
    id: "fill_horse_record",
    title: "Pferdeakten vervollständigen",
    description: "Unvollständige Pferdeakten finden und ergänzen",
    triggers: [/akte.*vervollständig/i, /was fehlt.*pferd/i, /unvollständig/i, /pferdeakte.*ergänz/i],
    buildSteps: () => [
      { tool: "get_incomplete_horses", description: "Unvollständige Akten laden", params: { max_score: 80 }, requires_confirm: false },
      { tool: "generate_completion_questions", description: "Ergänzungsfragen erstellen", params: {}, requires_confirm: true },
    ],
  },
];

function makeid(): string { return crypto.randomUUID(); }

async function executeTool(
  tool: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const today = new Date().toISOString().split("T")[0];

  switch (tool) {
    case "get_overdue_clients": {
      const days = (params.days_overdue as number) ?? 56;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select("client:profiles!client_id(id, full_name, phone, whatsapp_number), date")
        .eq("provider_id", userId)
        .lt("date", cutoff)
        .order("date", { ascending: false })
        .limit(50);
      // Deduplizieren nach client_id
      const seen = new Set<string>();
      const overdue: Array<{ id: string; full_name: string; phone?: string; last_appointment: string }> = [];
      for (const row of (data ?? []) as Array<{ client: { id: string; full_name: string; phone?: string } | null; date: string }>) {
        if (!row.client || seen.has(row.client.id)) continue;
        seen.add(row.client.id);
        overdue.push({ id: row.client.id, full_name: row.client.full_name, phone: row.client.phone, last_appointment: row.date });
      }
      return { clients: overdue, count: overdue.length };
    }

    case "build_whatsapp_drafts": {
      const clients = (context.clients as Array<{ full_name: string; phone?: string }>) ?? [];
      const drafts = clients
        .filter((c) => c.phone)
        .map((c) => ({
          name: c.full_name,
          phone: c.phone,
          text: `Hallo ${c.full_name.split(" ")[0]}, ich melde mich wegen eines neuen Termins für dein Pferd. Wann passt es dir?`,
        }));
      return { drafts, count: drafts.length };
    }

    case "get_today_appointments": {
      const date = (params.date as string) ?? today;
      const { data } = await supabase
        .from("appointments")
        .select("id, time, service_type, horses(name), client:profiles!client_id(id, full_name)")
        .eq("provider_id", userId)
        .eq("date", date)
        .in("status", ["scheduled", "confirmed"])
        .order("time", { ascending: true });
      return { appointments: data ?? [], count: (data ?? []).length, date };
    }

    case "create_invoices_batch": {
      const appointments = (context.appointments as Array<{ id: string; client?: { id?: string }; horses?: { name?: string }; service_type?: string }>) ?? [];
      const created: string[] = [];
      for (const appt of appointments) {
        const { data: inv } = await supabase
          .from("invoices")
          .insert({
            provider_id: userId,
            client_id: appt.client?.id ?? null,
            invoice_number: `HF-${Date.now().toString(36).toUpperCase()}`,
            issue_date: today,
            total_amount: 0,
            status: "draft",
            notes: `${appt.service_type ?? "Hufpflege"}${appt.horses?.name ? ": " + appt.horses.name : ""}`,
          })
          .select("id")
          .single();
        if (inv) created.push((inv as { id: string }).id);
      }
      return { created_count: created.length, invoice_ids: created };
    }

    case "get_day_appointments": {
      const date = (params.date as string) === "today" || !params.date ? today : params.date as string;
      const { data } = await supabase
        .from("appointments")
        .select("id, time, horses(name), client:profiles!client_id(full_name, address)")
        .eq("provider_id", userId)
        .eq("date", date)
        .in("status", ["scheduled", "confirmed"])
        .order("time", { ascending: true });
      return { appointments: data ?? [], count: (data ?? []).length, date };
    }

    case "optimize_route": {
      const appointments = (context.appointments as Array<{ time?: string; client?: { address?: string; full_name?: string } }>) ?? [];
      return { optimized: appointments, maps_link: null };
    }

    case "build_maps_link": {
      const appointments = (context.appointments as Array<{ client?: { address?: string } }>) ?? [];
      const addresses = appointments.map((a) => a.client?.address).filter(Boolean);
      const link = addresses.length > 0
        ? `https://maps.google.com/maps/dir/${addresses.map(encodeURIComponent).join("/")}`
        : null;
      return { maps_link: link, waypoints: addresses.length };
    }

    case "get_weather_forecast":
      return { rain_likely: true, description: "Regenwetter erwartet" };

    case "get_outdoor_appointments": {
      const { data } = await supabase
        .from("appointments")
        .select("id, time, horses(name), client:profiles!client_id(id, full_name, phone)")
        .eq("provider_id", userId)
        .eq("date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("time", { ascending: true });
      return { appointments: data ?? [], count: (data ?? []).length };
    }

    case "build_postpone_drafts": {
      const appointments = (context.appointments as Array<{ client?: { full_name?: string; phone?: string } }>) ?? [];
      const drafts = appointments
        .filter((a) => a.client?.phone)
        .map((a) => ({
          name: a.client?.full_name,
          phone: a.client?.phone,
          text: `Hallo ${(a.client?.full_name ?? "").split(" ")[0]}, wegen des Wetters muss ich unseren heutigen Termin leider verschieben. Ich melde mich wegen eines neuen Termins.`,
        }));
      return { drafts, count: drafts.length };
    }

    case "get_incomplete_horses": {
      const maxScore = (params.max_score as number) ?? 80;
      const { data } = await supabase
        .from("horses")
        .select("id, name, date_of_birth, breed, color, notes")
        .eq("owner_id", userId)
        .limit(20);
      const incomplete = (data ?? []).filter((h: Record<string, unknown>) => {
        let score = 0;
        if (h.name) score += 30;
        if (h.date_of_birth) score += 20;
        if (h.breed) score += 20;
        if (h.color) score += 15;
        if (h.notes) score += 15;
        return score < maxScore;
      });
      return { horses: incomplete, count: incomplete.length };
    }

    case "generate_completion_questions": {
      const horses = (context.horses as Array<{ name?: string }>) ?? [];
      const questions = horses.map((h) => `Welches Geburtsdatum und welche Rasse hat ${h.name ?? "dieses Pferd"}?`);
      return { questions, count: questions.length };
    }

    default:
      throw new Error(`Unbekanntes Tool: ${tool}`);
  }
}

export async function detectAndCreateTask(
  userText: string,
  userId: string,
  context: Record<string, unknown>,
): Promise<HufiTask | null> {
  const matched = TASK_TEMPLATES.find((t) =>
    t.triggers.some((rx) => rx.test(userText))
  );
  if (!matched) return null;

  const steps: TaskStep[] = matched.buildSteps(context).map((s) => ({
    ...s,
    id: makeid(),
    status: "pending" as const,
  }));

  const { data, error } = await supabase
    .from("hufi_task_queue")
    .insert({
      user_id: userId,
      title: matched.title,
      description: matched.description,
      trigger_phrase: userText.slice(0, 200),
      status: "pending",
      priority: 5,
      steps,
      current_step: 0,
      context,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as unknown as HufiTask;
}

export async function executeNextStep(
  task: HufiTask,
  userId: string,
  onProgress?: (step: TaskStep, message: string) => void,
): Promise<{ done: boolean; needsConfirm: boolean; step: TaskStep | null; task: HufiTask }> {
  const stepIdx = task.current_step;
  if (stepIdx >= task.steps.length) {
    return { done: true, needsConfirm: false, step: null, task };
  }

  const step = task.steps[stepIdx];
  if (!step) return { done: true, needsConfirm: false, step: null, task };

  if (step.requires_confirm && !step.confirmed_at) {
    await supabase
      .from("hufi_task_queue")
      .update({ status: "awaiting_confirm" })
      .eq("id", task.id)
      .eq("user_id", userId);
    return { done: false, needsConfirm: true, step, task: { ...task, status: "awaiting_confirm" } };
  }

  // Step ausführen
  const updatedSteps = [...task.steps];
  updatedSteps[stepIdx] = { ...step, status: "running" };
  await supabase
    .from("hufi_task_queue")
    .update({ status: "running", started_at: new Date().toISOString(), steps: updatedSteps })
    .eq("id", task.id)
    .eq("user_id", userId);

  onProgress?.(step, `${step.description}...`);

  let result: unknown;
  let stepError: string | undefined;
  try {
    result = await executeTool(step.tool, step.params, task.context, userId);
  } catch (err) {
    stepError = (err as Error).message;
  }

  const newStatus = stepError ? "failed" : "done";
  updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], status: newStatus as "done" | "failed", result, error: stepError };

  // Kontext mit Ergebnis anreichern
  const newContext = { ...task.context, ...((result as Record<string, unknown>) ?? {}) };
  const nextStep = stepIdx + 1;
  const allDone = nextStep >= task.steps.length || !!stepError;
  const taskStatus: TaskStatus = stepError ? "failed" : allDone ? "done" : "running";
  const summary = allDone
    ? buildSummary(task.title, updatedSteps)
    : undefined;

  await supabase
    .from("hufi_task_queue")
    .update({
      steps: updatedSteps,
      current_step: nextStep,
      context: newContext,
      status: taskStatus,
      result_summary: summary ?? null,
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq("id", task.id)
    .eq("user_id", userId);

  const updatedTask: HufiTask = {
    ...task,
    steps: updatedSteps,
    current_step: nextStep,
    context: newContext,
    status: taskStatus,
    result_summary: summary,
  };

  onProgress?.(updatedSteps[stepIdx], stepError ? `Fehler: ${stepError}` : `${step.description} ✓`);

  if (!allDone && !stepError) {
    return executeNextStep(updatedTask, userId, onProgress);
  }

  return { done: allDone, needsConfirm: false, step: updatedSteps[stepIdx], task: updatedTask };
}

function buildSummary(title: string, steps: TaskStep[]): string {
  const done = steps.filter((s) => s.status === "done").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  if (failed > 0) return `${title}: ${done} Schritte abgeschlossen, ${failed} fehlgeschlagen.`;

  // Tool-spezifische Zusammenfassung
  for (const step of steps) {
    const r = step.result as Record<string, unknown> | undefined;
    if (!r) continue;
    if (step.tool === "get_overdue_clients" && r.count !== undefined)
      return `${r.count} überfällige Kunden gefunden.`;
    if (step.tool === "create_invoices_batch" && r.created_count !== undefined)
      return `${r.created_count} Rechnungen als Entwurf angelegt.`;
    if (step.tool === "build_maps_link" && r.maps_link)
      return `Route mit ${r.waypoints} Stationen optimiert.`;
    if (step.tool === "get_incomplete_horses" && r.count !== undefined)
      return `${r.count} unvollständige Pferdeakten gefunden.`;
  }
  return `${title} abgeschlossen (${done} Schritte).`;
}

export async function confirmStep(
  taskId: string,
  stepId: string,
  userId: string,
): Promise<HufiTask | null> {
  const { data } = await supabase
    .from("hufi_task_queue")
    .select()
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();
  if (!data) return null;

  const task = data as unknown as HufiTask;
  const updatedSteps = task.steps.map((s) =>
    s.id === stepId ? { ...s, confirmed_at: new Date().toISOString() } : s
  );
  const updatedTask = { ...task, steps: updatedSteps };
  await supabase
    .from("hufi_task_queue")
    .update({ steps: updatedSteps, status: "running" })
    .eq("id", taskId)
    .eq("user_id", userId);

  const { task: finalTask } = await executeNextStep(updatedTask, userId);
  return finalTask;
}

export async function getActiveTasks(userId: string): Promise<HufiTask[]> {
  const { data } = await supabase
    .from("hufi_task_queue")
    .select()
    .eq("user_id", userId)
    .in("status", ["pending", "running", "awaiting_confirm"])
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []) as unknown as HufiTask[];
}

export async function cancelTask(taskId: string, userId: string): Promise<void> {
  await supabase
    .from("hufi_task_queue")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
}
