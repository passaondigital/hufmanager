import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getHorseKnowledgeForRole } from "./horse-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL_SMART = "claude-sonnet-4-6";
const MODEL_FAST  = "claude-haiku-4-5-20251001";
const MAX_HISTORY = 6;
const MAX_CTX_ROWS = 5;

// ── Typen ──────────────────────────────────────────────────────────────────────

interface Message { role: "user" | "assistant"; content: string; }

interface RequestBody {
  text: string;
  voiceMode?: boolean;
  history?: Message[];
  route?: string;
  mode?: "chat" | "action";
  clientTimestamp?: string;
}

interface ActionPlan {
  taskType: string;
  payload: Record<string, unknown>;
  explanation: string;
  confirmText: string;
}

// ── System Prompt ──────────────────────────────────────────────────────────────

const HUFI_BASE = `Du bist Hufi — persönlicher App-Assistent für Hufpfleger und Pferdehalter.
Stil: direkt, kurz, handlungsorientiert. Keine Floskeln, keine Ausweichmanöver.

Antwortregeln:
- ZUERST App-Kontext nutzen (echte Zahlen, echte Namen aus APP-KONTEXT unten).
- Wenn Daten vorhanden: konkret antworten. Z.B. "Du hast 3 Termine heute: 09:00 Moritz (K. Meier)."
- Wenn keine Daten: "Ich sehe aktuell keine [Kunden/Pferde/Termine] in deinem Account."
- NICHT generisch raten oder "Das kann ich leider nicht sehen" sagen.
- Voice-Modus: max 2 Sätze, kein Markdown.
- Chat-Modus: max 4 Sätze, Aufzählungen erlaubt.
- Duzen. Auf Deutsch.
- Notfall (Kolik, Nageltritt, Lahmheit, Hufrehe, Fieber, Atemnot): sofort Tierarzt empfehlen.
- NIEMALS tierärztliche Diagnose ersetzen.
Fachgebiete: Hufpflege, Huforthopädie, Stallmanagement, Kundenkommunikation, Betriebsorganisation, Krankheitsbilder (Hufrehe, Bockhuf, Strahlfäule, EMS, Cushing, Spat, Fesselträgerschaden).

Slot-Filling-Regel: Wenn der User eine Aktion will, für die wichtige Infos fehlen (Wer? Was? Wann? Wie?), stelle GENAU EINE klare Rückfrage. Nicht raten. Beispiel: "Alle heutigen Kunden oder bestimmte?" — dann warte auf Antwort.

Wetter-Reaktion: Wenn der User sagt "es regnet / Sturm / Frost" FRAGE: "Soll ich deine heutigen Kunden informieren? Wenn ja, alle oder bestimmte?" — empfehle NIE pauschal den Tag abzusagen.

Voice-Modus Sprachqualität:
- Schreibe Zahlen aus: nicht "8:30" sondern "halb neun", nicht "3" sondern "drei".
- Keine Bindestriche oder Schrägstriche mitten im Satz.
- Abkürzungen ausschreiben: "z.B." → "zum Beispiel", "ca." → "circa".
- Sätze mit Punkt abschließen, nicht mit "..." oder Doppelpunkt.
- Keine Aufzählungen mit "-" oder "*" — verwende stattdessen "erstens", "zweitens" oder beschreibe fließend.`;

const ROLE_INSTRUCTIONS: Record<string, string> = {
  provider: `
WICHTIG — Nutzerrolle: MOBILER HUFPFLEGE-DIENSTLEISTER
- Er fährt täglich zu Kunden. Kein eigener Stall.
- Wetter (Regen, Frost, Sturm) = NIE pauschal "nicht rausfahren" empfehlen.
  Stattdessen: Fragen ob Kunden informiert werden sollen, ob Termine verschoben werden.
- Er erstellt Rechnungen pro Termin oder per Abo-Modell.
- Hufpflege-Rhythmus: Kunden haben feste Intervalle (4/6/8 Wochen).
- Sein Erfolg = voller Kalender + bezahlte Rechnungen + zufriedene Pferde.
- Typische Probleme: Terminausfall, Stornos, überfällige Pferde, Rechnungen offen.`,

  client: `
WICHTIG — Nutzerrolle: PFERDEBESITZER / KUNDE
- Sucht Hufpfleger, verfolgt Gesundheit seines Pferdes.
- Hat keinen eigenen Betrieb, bucht Dienstleister.
- Braucht: Terminerinnerungen, Pflegehinweise, Impf-/Entwurmungskalender.`,

  employee: `
WICHTIG — Nutzerrolle: ANGESTELLTER HUFPFLEGER
- Arbeitet für einen Betrieb, hat eigene Tour-Zuweisung.
- Sieht nur eigene Termine, nicht alle Betriebsdaten.`,
};

function getRoleInstruction(userType: string | null): string {
  if (!userType) return "";
  return ROLE_INSTRUCTIONS[userType] ?? "";
}

const ACTION_SUFFIX = `

Du bist im AKTIONS-MODUS.
Antworte NUR als gültiges JSON (kein Markdown, kein Text davor/danach):
{
  "taskType": "create_invoice"|"create_appointment"|"set_reminder"|"add_expense"|"generic_action",
  "payload": { "horse_name": "...", "client_name": "...", "notes": "..." },
  "explanation": "Was du tun wirst (1 Satz)",
  "confirmText": "Bestätigungstext für den User"
}`;

// ── Context laden ──────────────────────────────────────────────────────────────

async function loadContext(userId: string, supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, apptRes, invoiceRes, horsesRes, memoryRes, clientCountRes, horseCountRes] = await Promise.allSettled([
    supabase.from("profiles").select("full_name, user_type").eq("id", userId).single(),
    supabase
      .from("appointments")
      .select("date, time, status, horses(name), client:profiles!client_id(full_name)")
      .eq("provider_id", userId)
      .eq("date", today)
      .in("status", ["scheduled", "confirmed"])
      .order("time", { ascending: true })
      .limit(MAX_CTX_ROWS),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", userId)
      .neq("payment_status", "paid"),
    supabase.from("horses").select("name").eq("owner_id", userId).limit(MAX_CTX_ROWS),
    supabase
      .from("hufi_memory")
      .select("category, key, value")
      .eq("user_id", userId)
      .order("last_updated", { ascending: false })
      .limit(4),
    // Kundenzahl: Profiles die dieser Provider angelegt hat
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("created_by_provider_id", userId),
    // Pferdezahl: Pferde der eigenen Kunden (via appointments distinct horse_id)
    supabase
      .from("appointments")
      .select("horse_id")
      .eq("provider_id", userId),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;

  const appointments = apptRes.status === "fulfilled" && apptRes.value.data
    ? (apptRes.value.data as Array<{
        date: string; time: string | null;
        horses: Array<{ name: string }> | { name: string } | null;
        client: { full_name: string } | null;
      }>).map((a) => ({
        date: a.date, time: a.time,
        horse_name: Array.isArray(a.horses) ? a.horses[0]?.name : (a.horses as { name: string } | null)?.name,
        client_name: a.client?.full_name,
      }))
    : [];

  const unpaidCount = invoiceRes.status === "fulfilled" ? (invoiceRes.value.count ?? 0) : 0;
  const horses = horsesRes.status === "fulfilled" && horsesRes.value.data
    ? (horsesRes.value.data as Array<{ name: string }>)
    : [];
  const memories = memoryRes.status === "fulfilled" && memoryRes.value.data
    ? (memoryRes.value.data as Array<{ category: string; key: string; value: Record<string, unknown> }>)
    : [];
  const clientCount = clientCountRes.status === "fulfilled" ? (clientCountRes.value.count ?? null) : null;
  const horseCount = horseCountRes.status === "fulfilled" && horseCountRes.value.data
    ? new Set((horseCountRes.value.data as Array<{ horse_id: string | null }>).map((r) => r.horse_id).filter(Boolean)).size
    : null;

  return { userName: profile?.full_name ?? null, userType: profile?.user_type ?? null, appointments, unpaidCount, horses, memories, clientCount, horseCount };
}

// ── Context Block bauen ────────────────────────────────────────────────────────

function buildContextBlock(ctx: Awaited<ReturnType<typeof loadContext>>, voiceMode: boolean, route?: string): string {
  const lines: string[] = [];

  if (ctx.userName) lines.push(`Nutzer: ${ctx.userName}`);
  if (ctx.userType) {
    const roleLabel: Record<string, string> = {
      provider: "Mobiler Hufpflege-Dienstleister",
      client: "Pferdebesitzer",
      employee: "Angestellter Hufpfleger",
    };
    lines.push(`Rolle: ${roleLabel[ctx.userType] ?? ctx.userType}`);
  }
  if (route) lines.push(`Aktuelle Seite: ${route}`);

  if (ctx.appointments.length > 0) {
    const list = ctx.appointments.map((a) => {
      const t = a.time ? a.time.slice(0, 5) : "?";
      return `${t}${a.horse_name ? ` ${a.horse_name}` : ""}${a.client_name ? ` (${a.client_name})` : ""}`;
    }).join(", ");
    lines.push(`Heutige Termine: ${list}`);
  } else {
    lines.push("Heutige Termine: keine");
  }

  if (ctx.unpaidCount > 0) lines.push(`Offene Rechnungen: ${ctx.unpaidCount}`);

  if (ctx.clientCount !== null) lines.push(`Kunden im System: ${ctx.clientCount}`);
  if (ctx.horseCount !== null && ctx.horseCount > 0) lines.push(`Betreute Pferde (alle Termine): ${ctx.horseCount}`);
  else if (ctx.horses.length > 0) lines.push(`Bekannte Pferde: ${ctx.horses.map((h) => h.name).join(", ")}`);

  if (ctx.memories.length > 0) {
    const memLines = ctx.memories
      .filter((m) => m.value && typeof m.value === "object")
      .map((m) => {
        const v = m.value as Record<string, unknown>;
        return `[${m.category}] ${v["content"] ?? v["text"] ?? JSON.stringify(v).slice(0, 60)}`;
      });
    if (memLines.length > 0) lines.push(`Eingemerkt:\n${memLines.join("\n")}`);
  }

  if (lines.length === 0) return "";
  const header = voiceMode ? "KONTEXT:" : "APP-KONTEXT (intern, nicht zitieren):";
  return `${header}\n${lines.join("\n")}`;
}

// ── Claude ──────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, messages: Message[], apiKey: string, model: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 512, system: systemPrompt, messages }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Claude ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const json = await res.json() as { content?: Array<{ type: string; text?: string }> };
    return json.content?.find((b) => b.type === "text")?.text ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ── Ollama ──────────────────────────────────────────────────────────────────────

async function callOllama(systemPrompt: string, messages: Message[], proxyBase: string, secret: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${proxyBase}/api/ollama/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ollama-secret": secret },
      body: JSON.stringify({
        model: "hufiai-core",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
        options: { temperature: 0.7, num_predict: 400 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const json = await res.json() as { message?: { content: string }; response?: string };
    return json.message?.content ?? json.response ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function selectModel(text: string, voiceMode: boolean): string {
  if (voiceMode) return MODEL_FAST;
  if (text.length < 80) return MODEL_FAST;
  return MODEL_SMART;
}

// ── Main ───────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonErr("Nicht angemeldet", 401);

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr("Nicht angemeldet", 401);

  let body: RequestBody;
  try { body = await req.json() as RequestBody; }
  catch { return jsonErr("Ungültige Anfrage", 400); }

  const { text, voiceMode = false, history = [], route, mode = "chat" } = body;
  if (!text?.trim()) return jsonErr("Kein Text", 400);

  // Kontext laden
  let ctx: Awaited<ReturnType<typeof loadContext>> = { userName: null, userType: null, appointments: [], unpaidCount: 0, horses: [], memories: [], clientCount: null, horseCount: null };
  try { ctx = await loadContext(user.id, supabase); }
  catch (e) { console.warn(`[hufi-agent][${requestId}] Kontext-Fehler:`, e); }

  const contextBlock = buildContextBlock(ctx, voiceMode, route);
  const systemPrompt = [
    HUFI_BASE,
    getRoleInstruction(ctx.userType),
    getHorseKnowledgeForRole(ctx.userType),
    contextBlock,
    mode === "action" ? ACTION_SUFFIX : "",
  ].filter(Boolean).join("\n\n");

  const messages: Message[] = [...history.slice(-MAX_HISTORY), { role: "user", content: text.trim() }];
  const model = selectModel(text, voiceMode);

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const OLLAMA_PROXY  = Deno.env.get("OLLAMA_PROXY_URL") ?? "";
  const OLLAMA_SECRET = Deno.env.get("OLLAMA_PROXY_SECRET") ?? "";

  let rawAnswer = "";
  let source: "claude" | "ollama" = "claude";

  if (ANTHROPIC_KEY) {
    try {
      rawAnswer = await callClaude(systemPrompt, messages, ANTHROPIC_KEY, model);
      source = "claude";
    } catch (e) {
      console.error(`[hufi-agent][${requestId}] Claude Fehler, versuche Ollama:`, e);
    }
  } else {
    console.warn(`[hufi-agent][${requestId}] Kein ANTHROPIC_KEY, nutze Ollama`);
  }

  if (!rawAnswer?.trim() && OLLAMA_PROXY) {
    try {
      rawAnswer = await callOllama(systemPrompt, messages, OLLAMA_PROXY, OLLAMA_SECRET);
      source = "ollama";
    } catch (e) {
      console.error(`[hufi-agent][${requestId}] Ollama Fehler:`, e);
    }
  }

  console.log(`[hufi-agent] id=${requestId} model=${model} source=${source} mode=${mode} dur=${Date.now() - t0}ms`);

  if (!rawAnswer?.trim()) {
    return new Response(
      JSON.stringify({ ok: false, error: "Ich erreiche Hufi gerade nicht. Bitte in einigen Sekunden erneut versuchen.", source: "none" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Action-Modus: JSON parsen
  if (mode === "action") {
    let actionPlan: ActionPlan | null = null;
    try {
      const cleaned = rawAnswer.replace(/```json?/g, "").replace(/```/g, "").trim();
      actionPlan = JSON.parse(cleaned) as ActionPlan;
    } catch {
      console.warn(`[hufi-agent][${requestId}] Action-JSON Parse-Fehler, nutze Text`);
    }
    return new Response(
      JSON.stringify({ ok: true, answer: actionPlan?.confirmText ?? rawAnswer, spokenText: actionPlan?.explanation ?? rawAnswer, source, actionPlan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, answer: rawAnswer, spokenText: rawAnswer, source }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
