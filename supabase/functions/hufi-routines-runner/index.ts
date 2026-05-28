import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // Fetch due routines
  const { data: routines, error } = await supabase
    .from("hufi_routines")
    .select("*")
    .eq("enabled", true)
    .lte("next_trigger_at", now)
    .not("next_trigger_at", "is", null);

  if (error) {
    console.error("Error fetching routines:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const results = { executed: 0, errors: 0, skipped: 0 };

  for (const routine of (routines ?? [])) {
    try {
      await executeRoutine(supabase, routine);
      results.executed++;

      // Compute next trigger
      const nextTrigger = computeNextTrigger(routine.trigger_type, routine.trigger_config);
      await supabase
        .from("hufi_routines")
        .update({
          last_triggered_at: now,
          next_trigger_at: nextTrigger ?? null,
          trigger_count: (routine.trigger_count ?? 0) + 1,
        })
        .eq("id", routine.id);
    } catch (e) {
      console.error(`Error executing routine ${routine.id}:`, e);
      results.errors++;
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ── Execute a single routine ──────────────────────────────────────────────────

async function executeRoutine(supabase: ReturnType<typeof createClient>, routine: Record<string, unknown>) {
  const actionType = routine.action_type as string;
  const actionConfig = (routine.action_config ?? {}) as Record<string, unknown>;
  const userId = routine.user_id as string;

  if (actionType === "notification" || actionType === "hufi_message") {
    const title = (actionConfig.title as string) ?? (routine.label as string);
    const message = (actionConfig.message as string) ?? "";

    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type: actionType === "hufi_message" ? "hufi_message" : "routine",
      link: (actionConfig.route as string) ?? null,
      is_read: false,
    });

    // Send push if subscriptions exist
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (subs && subs.length > 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ userId, title, body: message }),
      });
    }
    return;
  }

  if (actionType === "ai_briefing") {
    const prompt = (actionConfig.prompt as string) ?? "Erstelle ein kurzes Briefing.";
    const includeAppointments = actionConfig.include_appointments !== false;
    const includeInvoices = actionConfig.include_invoices !== false;

    // Gather context
    const today = new Date().toISOString().split("T")[0];
    let context = "";

    if (includeAppointments) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("date, time, service_type, horses(name)")
        .eq("provider_id", userId)
        .gte("date", today)
        .lte("date", today)
        .order("time", { ascending: true });
      if (appts && appts.length > 0) {
        context += `\nHeutige Termine (${appts.length}):\n`;
        for (const a of appts) {
          const horse = (a.horses as Record<string, string>)?.name ?? "Unbekannt";
          context += `- ${a.time} Uhr: ${a.service_type ?? "Hufpflege"} bei ${horse}\n`;
        }
      }
    }

    if (includeInvoices) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, status, client_name")
        .eq("provider_id", userId)
        .eq("status", "open")
        .limit(5);
      if (invoices && invoices.length > 0) {
        const total = invoices.reduce((s: number, i: Record<string, number>) => s + (i.total_amount ?? 0), 0);
        context += `\nOffene Rechnungen: ${invoices.length} (Gesamt: €${total.toFixed(2)})\n`;
      }
    }

    // Call Claude
    const systemMsg = `Du bist Hufi, ein KI-Assistent für Hufpfleger. Sei kurz, prägnant und freundlich. Datum: ${new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemMsg,
        messages: [{ role: "user", content: `${prompt}\n\nKontext:${context || " Keine Daten verfügbar."}` }],
      }),
    });

    let briefingText = "Hufi-Briefing konnte nicht erstellt werden.";
    if (aiRes.ok) {
      const aiJson = await aiRes.json();
      briefingText = aiJson.content?.[0]?.text ?? briefingText;
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: routine.label as string,
      message: briefingText,
      type: "ai_briefing",
      is_read: false,
    });
    return;
  }

  if (actionType === "data_write") {
    // Placeholder: future expansion for auto-creating appointments/invoices
    console.log(`data_write routine ${routine.id} — not yet implemented`);
  }
}

// ── Next trigger calculation (mirrors frontend logic) ─────────────────────────

function computeNextTrigger(type: string, config: Record<string, unknown>): string | null {
  const now = new Date();

  if (type === "daily_time" && config.time) {
    const [h, m] = (config.time as string).split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (type === "weekly" && config.time) {
    const [h, m] = (config.time as string).split(":").map(Number);
    const targetDay = (config.weekday as number) ?? 0;
    const jsDay = now.getDay();
    const moDay = jsDay === 0 ? 6 : jsDay - 1;
    let daysUntil = (targetDay - moDay + 7) % 7;
    const next = new Date(now);
    if (daysUntil === 0) {
      next.setHours(h, m, 0, 0);
      if (next <= now) daysUntil = 7;
    }
    if (daysUntil > 0) next.setDate(next.getDate() + daysUntil);
    next.setHours(h, m, 0, 0);
    return next.toISOString();
  }

  if (type === "interval_days" && config.days) {
    const next = new Date(now);
    next.setDate(next.getDate() + (config.days as number));
    return next.toISOString();
  }

  return null;
}
