import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_HISTORY = 6;
const MAX_CONTEXT_ROWS = 5;

const HUFI_SYSTEM_PROMPT = `Du bist Hufi, der KI-Assistent für Hufpflege- und Pferdebetriebs-Management.

DEINE ROLLE:
- Professioneller Pferdebranchen-Assistent für Hufpfleger, Stallbetreiber und Pferdebesitzer
- Fachkompetenz: Hufpflege, Huforthopädie, Stallmanagement, Kundenkommunikation, Betriebsorganisation
- Kennst gängige Krankheitsbilder: Hufrehe, Bockhuf, Strahlfäule, Kolik, EMS, Cushing, Spat, Fesselträgerschaden

VERHALTENSREGELN:
- Klare, direkte Antworten. Im Voice-Modus: kurze Sätze, kein Markdown.
- Im Chat-Modus: strukturierte Antworten, Aufzählungen erlaubt.
- Bei Terminfragen: nutze den bereitgestellten Kontext.
- Bei unbekannten Daten: sage das ehrlich und bitte um mehr Infos.
- NIEMALS eine tierärztliche Diagnose ersetzen.

NOTFALL-PROTOKOLL (immer Tierarzt empfehlen bei):
- Lahmheit (akut, stark)
- Kolik-Verdacht (Schwitzen, Wälzen, kein Kotabsatz)
- Nageltritt oder Verletzung im Huf
- Fieber über 38,5°C
- Atemnot
- Hufrehe-Verdacht (heiße Hufe, Zehengänger)
- Starke Schwellung an Beinen oder Gelenken

KOMMUNIKATION:
- Duze den Nutzer
- Professionell aber freundlich
- Auf Deutsch
- Kurze Antworten bevorzugen (max. 3-4 Sätze wenn möglich)`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  text: string;
  voiceMode?: boolean;
  history?: Message[];
  route?: string;
  clientTimestamp?: string;
}

interface HufiContext {
  userName?: string | null;
  role?: string | null;
  todayAppointments?: Array<{ date: string; time: string | null; horse_name?: string; client_name?: string }>;
  unpaidInvoices?: number;
  overdueHorses?: Array<{ name: string }>;
  recentBefunde?: Array<{ pferd_name: string | null; befund_text: string | null; created_at: string }>;
}

async function loadContext(userId: string, supabase: ReturnType<typeof createClient>): Promise<HufiContext> {
  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, apptRes, invoiceRes, horsesRes, befundeRes] = await Promise.allSettled([
    supabase.from("profiles").select("full_name, user_type").eq("id", userId).single(),
    supabase
      .from("appointments")
      .select("date, time, status, horses(name), client:profiles!client_id(full_name)")
      .eq("provider_id", userId)
      .eq("date", today)
      .in("status", ["scheduled", "confirmed"])
      .order("time", { ascending: true })
      .limit(MAX_CONTEXT_ROWS),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", userId)
      .neq("payment_status", "paid"),
    supabase
      .from("horses")
      .select("name")
      .eq("owner_id", userId)
      .limit(MAX_CONTEXT_ROWS),
    supabase
      .from("ai_befunde")
      .select("pferd_name, befund_text, created_at")
      .eq("provider_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;

  const appointments = apptRes.status === "fulfilled" && apptRes.value.data
    ? (apptRes.value.data as Array<{
        date: string;
        time: string | null;
        horses: Array<{ name: string }> | { name: string } | null;
        client: { full_name: string } | null;
      }>).map((a) => ({
        date: a.date,
        time: a.time,
        horse_name: Array.isArray(a.horses) ? a.horses[0]?.name : (a.horses as { name: string } | null)?.name,
        client_name: a.client?.full_name,
      }))
    : [];

  const unpaidCount = invoiceRes.status === "fulfilled" ? (invoiceRes.value.count ?? 0) : 0;
  const horses = horsesRes.status === "fulfilled" && horsesRes.value.data
    ? (horsesRes.value.data as Array<{ name: string }>)
    : [];
  const befunde = befundeRes.status === "fulfilled" && befundeRes.value.data
    ? (befundeRes.value.data as Array<{ pferd_name: string | null; befund_text: string | null; created_at: string }>)
    : [];

  return {
    userName: profile?.full_name ?? null,
    todayAppointments: appointments,
    unpaidInvoices: unpaidCount,
    overdueHorses: horses,
    recentBefunde: befunde,
  };
}

function buildContextBlock(ctx: HufiContext, voiceMode: boolean, route?: string): string {
  const lines: string[] = [];

  if (ctx.userName) lines.push(`Nutzer: ${ctx.userName}`);
  if (route) lines.push(`Aktuelle Seite: ${route}`);

  if (ctx.todayAppointments && ctx.todayAppointments.length > 0) {
    const appts = ctx.todayAppointments.map((a) => {
      const time = a.time ? a.time.slice(0, 5) : "keine Zeit";
      const horse = a.horse_name ? ` – ${a.horse_name}` : "";
      const client = a.client_name ? ` (${a.client_name})` : "";
      return `${time}${horse}${client}`;
    }).join(", ");
    lines.push(`Heutige Termine: ${appts}`);
  } else {
    lines.push("Heutige Termine: keine");
  }

  if (ctx.unpaidInvoices && ctx.unpaidInvoices > 0) {
    lines.push(`Offene Rechnungen: ${ctx.unpaidInvoices}`);
  }

  if (ctx.overdueHorses && ctx.overdueHorses.length > 0) {
    const names = ctx.overdueHorses.map((h) => h.name).join(", ");
    lines.push(`Bekannte Pferde: ${names}`);
  }

  if (ctx.recentBefunde && ctx.recentBefunde.length > 0) {
    const b = ctx.recentBefunde[0];
    if (b.pferd_name && b.befund_text) {
      lines.push(`Letzter Befund: ${b.pferd_name} — ${b.befund_text.slice(0, 80)}`);
    }
  }

  if (lines.length === 0) return "";

  const header = voiceMode
    ? "KONTEXT:"
    : "AKTUELLER APP-KONTEXT (nur intern, nicht zitieren):";
  return `${header}\n${lines.join("\n")}`;
}

async function callClaude(
  systemPrompt: string,
  messages: Message[],
  apiKey: string,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages,
      }),
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

async function callOllama(
  systemPrompt: string,
  messages: Message[],
  proxyBase: string,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const ollamaMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const res = await fetch(`${proxyBase}/api/ollama/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hufiai-core",
        messages: ollamaMessages,
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

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonErr("Nicht angemeldet", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonErr("Nicht angemeldet", 401);
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return jsonErr("Ungültige Anfrage", 400);
  }

  const { text, voiceMode = false, history = [], route } = body;
  if (!text?.trim()) {
    return jsonErr("Kein Text", 400);
  }

  // Kontext laden (Fehler ignorieren, weiter machen)
  let ctx: HufiContext = {};
  try {
    ctx = await loadContext(user.id, supabase);
  } catch (e) {
    console.warn("[hufi-agent] Kontext laden fehlgeschlagen:", e);
  }

  const contextBlock = buildContextBlock(ctx, voiceMode, route);
  const systemPrompt = contextBlock
    ? `${HUFI_SYSTEM_PROMPT}\n\n${contextBlock}`
    : HUFI_SYSTEM_PROMPT;

  const messages: Message[] = [
    ...history.slice(-MAX_HISTORY),
    { role: "user", content: text.trim() },
  ];

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const OLLAMA_PROXY = Deno.env.get("OLLAMA_PROXY_URL") ?? "";

  let answer = "";
  let source: "claude" | "ollama" = "claude";

  if (ANTHROPIC_API_KEY) {
    try {
      answer = await callClaude(systemPrompt, messages, ANTHROPIC_API_KEY);
      source = "claude";
    } catch (e) {
      console.error("[hufi-agent] Claude Fehler, versuche Ollama:", e);
    }
  } else {
    console.warn("[hufi-agent] ANTHROPIC_API_KEY fehlt, nutze Ollama");
  }

  if (!answer?.trim() && OLLAMA_PROXY) {
    try {
      answer = await callOllama(systemPrompt, messages, OLLAMA_PROXY);
      source = "ollama";
    } catch (e) {
      console.error("[hufi-agent] Ollama Fallback Fehler:", e);
    }
  }

  if (!answer?.trim()) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Ich erreiche Hufi gerade nicht. Bitte in einigen Sekunden erneut versuchen.",
        source: "none",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      answer,
      spokenText: answer,
      source,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
