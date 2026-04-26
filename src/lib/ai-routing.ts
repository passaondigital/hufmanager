import { supabase } from "@/integrations/supabase/client";
import { RecognizedEntity, buildB2BReportContext } from "./ontology-service";

const WHISPER_ENDPOINT = "/api/local-ai/transcribe";
const OLLAMA_ENDPOINT = "/api/ollama/api/chat";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

const CLAUDE_HAIKU  = "claude-haiku-4-5-20251001";
const CLAUDE_SONNET = "claude-sonnet-4-6";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Credit System ─────────────────────────────────────────────────────────────

export class CreditExhaustedException extends Error {
  constructor() { super("Kein KI-Guthaben mehr"); }
}

export async function checkAndUseCredit(
  userId: string,
  model: "fast" | "smart",
): Promise<boolean> {
  const modelName = model === "fast" ? "claude-haiku" : "claude-sonnet";
  const { data, error } = await supabase.rpc("use_hufi_credit", {
    p_user_id: userId,
    p_model: modelName,
  });
  if (error) {
    // Table might not exist yet — fail open during setup
    if (error.code === "42P01") return true;
    throw error;
  }
  if (!data) throw new CreditExhaustedException();
  return true;
}

function anthropicKey(): string | null {
  const k = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  return k?.trim() || null;
}

function toClaudeModel(hint: string | null | undefined): string {
  if (hint === "hufiai-fast") return CLAUDE_HAIKU;
  return CLAUDE_SONNET;
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(messages: ChatMessage[], model: string): Promise<string> {
  const key = anthropicKey()!;
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs   = messages.filter((m) => m.role !== "system");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Claude ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const json = await res.json() as { content?: { text: string }[] };
    return json.content?.[0]?.text ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ── Ollama Fallback ───────────────────────────────────────────────────────────
async function callOllama(messages: ChatMessage[], model: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.7, num_predict: 512 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const json = await res.json() as { message?: { content: string }; response?: string };
    return json.message?.content ?? json.response ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Route: Claude Haiku  (forceModel="hufiai-fast" / knowledge)
 *        Claude Sonnet (default / agent_lookup / agent_action / B2B)
 *        Ollama        (fallback when VITE_ANTHROPIC_API_KEY not set)
 */
export async function chatWithHufAI(
  messages: ChatMessage[],
  userId: string,
  forceModel?: string,
): Promise<string> {
  // Deduct credit for authenticated users (fail open if table not ready)
  if (userId && userId !== "anonymous") {
    await checkAndUseCredit(userId, forceModel === "hufiai-fast" ? "fast" : "smart");
  }

  if (anthropicKey()) {
    return callClaude(messages, toClaudeModel(forceModel));
  }

  // Ollama fallback — resolve model from user profile when not forced
  let model = forceModel ?? null;
  if (!model || model === "hufiai-fast" || model === "hufiai-core") {
    if (!model) {
      const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("user_type").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
      model = (profile?.user_type === "pro" || roleData?.role === "provider" || roleData?.role === "admin")
        ? "hufiai-core" : "hufiai-fast";
    }
  }
  return callOllama(messages, model);
}

// ── Whisper STT ───────────────────────────────────────────────────────────────
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  const res = await fetch(WHISPER_ENDPOINT, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Whisper ${res.status}`);
  const json = await res.json() as { text?: string };
  return json.text?.trim() ?? "";
}

// ── System Prompts ────────────────────────────────────────────────────────────
export const BEFUND_SYSTEM_PROMPT = `Du bist ein spezialisierter KI-Assistent für die Pferdehufpflege und Veterinärmedizin.
Du hilfst Hufpflegern, Tierärzten und Therapeuten bei der Dokumentation und Planung.

Fachgebiete: Huftechnik, Orthopädie, Veterinärmedizin, Physiotherapie, Osteopathie.
Bekannte Begriffe: Hufrehe, Bockhuf, Trachtenlänge, Spat, Fesselträgerschaden, Kolik, Cushing, EMS.

Antworte präzise, professionell und auf Deutsch.
Bei Sprachnotizen: Extrahiere den Befund strukturiert (Pferd, Datum, Befund, Maßnahme, Nächster Termin).

TERMINOLOGIE-PROTOKOLL:
- Verwende klinisch korrekte Fachbegriffe (z.B. "Pododermatitis superficialis cunei" statt nur "Strahlfäule")
- Nenne immer den deutschen UND den lateinischen/internationalen Fachbegriff
- Strukturiere Befunde nach veterinärmedizinischem Standard: Pferd, Datum, Befund (ICD-ähnlich), Diagnose, Therapieplan, Prognose, Kontrolltermin
- Unterscheide zwischen Verdachtsdiagnose und gesicherter Diagnose
- Für B2B-Berichte: verwende die formale Terminologie aus equine_ontology`;

const B2B_REPORT_SYSTEM_PROMPT = `Du bist ein veterinärmedizinischer Dokumentationsassistent und erstellst formale Hufbefund-Protokolle.
Erstelle einen strukturierten, professionellen Bericht nach veterinärmedizinischem Standard.

ANFORDERUNGEN:
- Verwende ausschließlich formale veterinärmedizinische Fachbegriffe (Latein/International)
- Strukturiere den Bericht nach dem vorgegebenen Protokoll-Template
- Unterscheide klar zwischen Verdachtsdiagnose und gesicherter Diagnose
- Verwende die erkannten Fachbegriffe in ihrer formalen Form
- Schreibe in sachlichem, professionellem Stil

Antworte NUR mit dem formatierten Protokoll in Markdown, kein Text davor oder danach.`;

export async function generateB2BReport(
  transcript: string,
  entities: RecognizedEntity[],
  userId: string,
): Promise<string> {
  const ontologyContext = buildB2BReportContext(entities);
  const today = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });

  const userMessage = `Erstelle ein formales Hufbefund-Protokoll basierend auf dieser Sprachnotiz.

${ontologyContext ? ontologyContext + "\n\n" : ""}Sprachnotiz:
"${transcript}"

Das Protokoll soll folgendem Format entsprechen:

## Hufbefund-Protokoll
**Datum:** [Datum aus Notiz oder ${today}]
**Pferd:** [Name des Pferdes]

### Klinischer Befund
[Formale Beschreibung mit lateinischen/internationalen Fachbegriffen]

### Diagnose
[ICD-ähnliche Diagnose mit formalen Begriffen aus der Ontologie]

### Therapeutische Maßnahmen
[Formaler Therapieplan]

### Prognose
[Klinische Prognose]

### Empfehlung Kontrolltermin
[Empfehlung für den nächsten Termin]`;

  // B2B immer Sonnet (hufiai-core maps to Sonnet)
  return chatWithHufAI(
    [{ role: "system", content: B2B_REPORT_SYSTEM_PROMPT }, { role: "user", content: userMessage }],
    userId,
    "hufiai-core",
  );
}
