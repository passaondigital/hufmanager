import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY    = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today    = new Date().toISOString().split("T")[0];

  // Alle Provider holen
  const { data: providers } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "provider");

  if (!providers?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sentCount = 0;

  for (const { user_id } of providers) {
    try {
      const sent = await sendBriefingForProvider(supabase, user_id, today);
      if (sent) sentCount++;
    } catch (e) {
      console.error(`Briefing failed for ${user_id}:`, e);
    }
  }

  return new Response(JSON.stringify({ sent: sentCount }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ── Briefing für einen Provider ────────────────────────────────────────────────

async function sendBriefingForProvider(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  today: string,
): Promise<boolean> {

  // 1. Heutiger Name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const firstName = (profile?.full_name ?? "").split(" ")[0] || null;

  // 2. Termine heute
  const { data: appts } = await supabase
    .from("appointments")
    .select("time, service_type, horses(name)")
    .eq("provider_id", userId)
    .eq("date", today)
    .in("status", ["scheduled", "confirmed"])
    .order("time", { ascending: true });
  const apptCount = appts?.length ?? 0;
  const firstAppt = appts?.[0];
  const firstHorse = firstAppt
    ? (Array.isArray(firstAppt.horses)
        ? (firstAppt.horses[0] as Record<string, string>)?.name
        : (firstAppt.horses as Record<string, string> | null)?.name)
    : null;

  // 3. Offene Rechnungen (Betrag + Anzahl)
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("total_amount, status")
    .eq("provider_id", userId)
    .neq("payment_status", "paid")
    .neq("status", "cancelled");
  const openInvCount = openInvoices?.length ?? 0;
  const openInvTotal = (openInvoices ?? []).reduce(
    (s: number, i: Record<string, number>) => s + (i.total_amount ?? 0), 0,
  );

  // 4. Überfällige Pferde: pro Pferd nach INDIVIDUELLEM shoeing_interval (Wochen),
  // nicht nach festem 8-Wochen-Pauschalwert (Hebel 4 / Schritt 4 HUFI_ROADMAP.md).
  const { data: recentAppts } = await supabase
    .from("appointments")
    .select("horse_id, date, horses(id, name, shoeing_interval)")
    .eq("provider_id", userId)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(150);

  interface OverdueHorse { id: string; name: string; weeksOverdue: number; suggestedDate: string; }
  const seen = new Set<string>();
  const overdueHorses: OverdueHorse[] = [];
  for (const a of (recentAppts ?? []) as Array<{ horse_id: string; date: string; horses: unknown }>) {
    if (!a.horse_id || seen.has(a.horse_id)) continue;
    seen.add(a.horse_id);
    const h = Array.isArray(a.horses) ? a.horses[0] : a.horses as Record<string, unknown> | null;
    const name = (h as Record<string, unknown> | null)?.name as string | undefined;
    const intervalWeeks = (h as Record<string, unknown> | null)?.shoeing_interval as number | null | undefined;
    if (!name) continue;
    const intervalDays = intervalWeeks ? intervalWeeks * 7 : 56;
    const lastDate = new Date(a.date);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86_400_000);
    if (daysSince >= intervalDays - 7) {
      const suggestedDate = new Date(lastDate.getTime() + intervalDays * 86_400_000).toISOString().split("T")[0];
      overdueHorses.push({ id: a.horse_id, name, weeksOverdue: Math.floor(daysSince / 7), suggestedDate });
    }
    if (overdueHorses.length >= 10) break;
  }

  // Vorschläge persistieren (data_write) + Dedup: ein Pferd wird nur alle 6 Tage erneut erwähnt.
  const toMention = await upsertFollowupSuggestions(supabase, userId, overdueHorses);

  // 5. Niedriger Lagerbestand
  const { data: lowStock } = await supabase
    .from("inventory_items")
    .select("product_name, current_stock, min_stock")
    .eq("user_id", userId)
    .not("min_stock", "is", null);

  const lowStockItems = (lowStock ?? []).filter(
    (i: Record<string, number | null>) =>
      i.min_stock !== null && (i.current_stock ?? 0) <= (i.min_stock ?? 0),
  ).slice(0, 3);

  // 6. Relevanz-Check: nur senden, wenn es wirklich etwas zu berichten gibt.
  // "Keine Termine, keine Rechnungen, nichts fällig" ist Spam — dann bleibt Hufi still
  // (UI-Aufräumen, 17.07.2026 — Punkt 6: Morgen-Briefing-Notifications).
  const hasRelevantContent =
    apptCount > 0 || openInvCount > 0 || toMention.length > 0 || lowStockItems.length > 0;

  if (!hasRelevantContent) return false;

  // 7. Claude AI Briefing-Text
  const overdueForText = toMention.map((h) => `${h.name} (Folgetermin-Vorschlag: ${formatDateDe(h.suggestedDate)})`);
  const briefingText = await generateAiBriefing({
    firstName,
    apptCount,
    firstHorse,
    firstTime: firstAppt?.time?.slice(0, 5) ?? null,
    openInvCount,
    openInvTotal,
    overdueHorses: overdueForText,
    lowStockItems: lowStockItems.map((i: Record<string, unknown>) => String(i.product_name ?? "")),
    today,
  });

  // 8. In-App-Benachrichtigung anlegen
  await supabase.from("notifications").insert({
    user_id: userId,
    title: "🌅 Morgen-Briefing",
    message: briefingText,
    type: "briefing",
    link: apptCount > 0 ? "/kalender" : "/cockpit",
    is_read: false,
  });

  // 9. Push Notification
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId);

  if (subs && subs.length > 0) {
    const pushTitle = apptCount > 0
      ? `🌅 Heute ${apptCount} Termin${apptCount > 1 ? "e" : ""}${firstTime(firstAppt) ? ` — erster: ${firstTime(firstAppt)}` : ""}`
      : "🌅 Morgen-Briefing";
    const pushBody = briefingText.slice(0, 140);

    await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ userId, title: pushTitle, body: pushBody }),
    });
  }

  return true;
}

function firstTime(appt: Record<string, unknown> | undefined): string | null {
  if (!appt?.time) return null;
  return String(appt.time).slice(0, 5);
}

function formatDateDe(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// ── Folgetermin-Vorschläge: persistieren + Dedup (Hebel 4 / Schritt 4) ─────────
// Schreibt/aktualisiert je überfälligem Pferd einen Vorschlag (die bisher fehlende
// "data_write"-Routine) und liefert nur die Pferde zurück, die HEUTE erwähnt werden
// sollen — neue Vorschläge sofort, bereits genannte erst wieder nach 6 Tagen.
async function upsertFollowupSuggestions(
  supabase: ReturnType<typeof createClient>,
  providerId: string,
  overdueHorses: Array<{ id: string; name: string; weeksOverdue: number; suggestedDate: string }>,
): Promise<Array<{ id: string; name: string; weeksOverdue: number; suggestedDate: string }>> {
  if (overdueHorses.length === 0) return [];

  const { error: upsertError } = await supabase
    .from("hufi_followup_suggestions")
    .upsert(
      overdueHorses.map((h) => ({
        horse_id: h.id,
        provider_id: providerId,
        suggested_date: h.suggestedDate,
        weeks_overdue: h.weeksOverdue,
      })),
      { onConflict: "horse_id" },
    );
  if (upsertError) {
    console.error("upsertFollowupSuggestions failed:", upsertError.message);
    return overdueHorses.slice(0, 3);
  }

  const { data: existing } = await supabase
    .from("hufi_followup_suggestions")
    .select("horse_id, last_notified_at")
    .in("horse_id", overdueHorses.map((h) => h.id));

  const lastNotifiedMap = new Map<string, string | null>(
    ((existing ?? []) as Array<{ horse_id: string; last_notified_at: string | null }>)
      .map((r) => [r.horse_id, r.last_notified_at]),
  );
  const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

  const toMention = overdueHorses.filter((h) => {
    const lastNotified = lastNotifiedMap.get(h.id);
    return !lastNotified || new Date(lastNotified).getTime() < sixDaysAgo;
  }).slice(0, 3);

  if (toMention.length > 0) {
    await supabase
      .from("hufi_followup_suggestions")
      .update({ status: "notified", last_notified_at: new Date().toISOString() })
      .in("horse_id", toMention.map((h) => h.id));
  }

  return toMention;
}

// ── Claude AI Text-Generierung ─────────────────────────────────────────────────

async function generateAiBriefing(data: {
  firstName: string | null;
  apptCount: number;
  firstHorse: string | null;
  firstTime: string | null;
  openInvCount: number;
  openInvTotal: number;
  overdueHorses: string[];
  lowStockItems: string[];
  today: string;
}): Promise<string> {
  if (!ANTHROPIC_API_KEY) return buildFallbackBriefing(data);

  const date = new Date(data.today).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });
  const ctx: string[] = [];
  if (data.apptCount > 0) ctx.push(`${data.apptCount} Termin${data.apptCount > 1 ? "e" : ""} heute${data.firstHorse ? `, erster: ${data.firstHorse}` : ""}${data.firstTime ? ` um ${data.firstTime}` : ""}`);
  else ctx.push("keine Termine heute");
  if (data.openInvCount > 0) ctx.push(`${data.openInvCount} offene Rechnungen (${data.openInvTotal.toFixed(2)} €)`);
  if (data.overdueHorses.length > 0) ctx.push(`fällige Pferde mit Folgetermin-Vorschlag: ${data.overdueHorses.join(", ")}`);
  if (data.lowStockItems.length > 0) ctx.push(`niedriger Lagerbestand: ${data.lowStockItems.join(", ")}`);

  const systemMsg = `Du bist Hufi, ein KI-Assistent für Hufpfleger. Erstelle ein sehr kurzes Morgen-Briefing (2–4 Sätze, max. 200 Zeichen). Sei direkt, klar, kein Smalltalk. Kein Emoji. Nur das Wichtigste. Datum: ${date}.`;
  const userMsg = `Briefing für${data.firstName ? ` ${data.firstName}` : " den Hufpfleger"}:\n${ctx.join("\n")}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const text = json.content?.[0]?.text ?? "";
      if (text) return text;
    }
  } catch { /* fallback */ }

  return buildFallbackBriefing(data);
}

function buildFallbackBriefing(data: {
  firstName: string | null;
  apptCount: number;
  firstHorse: string | null;
  firstTime: string | null;
  openInvCount: number;
  openInvTotal: number;
  overdueHorses: string[];
  lowStockItems: string[];
}): string {
  const parts: string[] = [];
  const name = data.firstName ? `${data.firstName}, ` : "";
  if (data.apptCount > 0)
    parts.push(`${name}heute ${data.apptCount} Termin${data.apptCount > 1 ? "e" : ""}${data.firstTime ? `, erster um ${data.firstTime}` : ""}.`);
  else
    parts.push(`${name}heute keine Termine.`);
  if (data.openInvCount > 0)
    parts.push(`${data.openInvCount} offene Rechnungen (${data.openInvTotal.toFixed(2)} €).`);
  if (data.overdueHorses.length > 0)
    parts.push(`Folgetermin fällig: ${data.overdueHorses.join(", ")}.`);
  if (data.lowStockItems.length > 0)
    parts.push(`Lager niedrig: ${data.lowStockItems.join(", ")}.`);
  return parts.join(" ");
}
