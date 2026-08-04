import { supabase } from "@/integrations/supabase/client";

export interface HufiAgentMessage {
  role: "user" | "assistant";
  content: string;
}

// Kurzzeitkontext "worüber reden wir gerade" (Etappe 3, siehe AGENT_ANALYSE.md).
// Rundtrip: wird pro Anfrage mitgeschickt, kommt aus der Edge Function aktualisiert
// zurück und soll unverändert im gleichen State wie die Chat-Historie liegen.
export interface ConversationFocus {
  horseId?: string;
  horseName?: string;
  clientId?: string;
  clientName?: string;
  pendingClarification?: string;
}

// Wird gesetzt, wenn Claude ein mutierendes Tool aufrufen wollte (z.B.
// cancel_appointment) -- die Ausführung wartet auf echte Nutzer-Bestätigung
// über hufi_task_queue (siehe hufi-task-engine.ts: confirmStep), nicht
// automatisch. Siehe AGENT_ANALYSE.md Etappe 1, Sicherheits-Check.
export interface HufiPendingConfirmation {
  taskId: string;
  stepId: string;
  taskType: string;
  description: string;
}

export interface HufiAgentResponse {
  ok: boolean;
  answer: string;
  spokenText: string;
  source: "claude" | "ollama" | "guard" | "none";
  error?: string;
  pendingConfirmation?: HufiPendingConfirmation;
  // A3: gesetzt wenn die Antwort eine Fach-Verweis-Antwort ist (Guard hat
  // gegriffen) ODER eine allgemeine Fachaussage enthält (Medizin/Recht),
  // ohne blockiert zu sein — steuert den Hinweis-Badge in der Chat-Bubble.
  disclaimerCategory?: "medical" | "legal";
  conversationFocus?: ConversationFocus;
}

// Kontrollierter Timeout für die Agentenanfrage (P0 Abschnitt 5/1) -- ohne
// das hing die UI bei einer hängenden Edge Function unbegrenzt in
// "responding", ohne dass je ein Fehler oder Timeout sichtbar wurde.
const AGENT_TIMEOUT_MS = 25_000;

export async function askHufiAgent(params: {
  text: string;
  voiceMode?: boolean;
  history?: HufiAgentMessage[];
  route?: string;
  clientTimestamp?: string;
  clientTimezone?: string;
  clientLocation?: { lat: number; lon: number };
  conversationFocus?: ConversationFocus;
}): Promise<HufiAgentResponse> {
  // Eine correlationId pro Anfrage -- dieselbe ID läuft als Header in die
  // Edge Function mit, damit sich ein Vorfall über Client- und
  // Server-Logs hinweg an einer Stelle zusammensetzen lässt (P0 Abschnitt 1).
  // Keine sensiblen Inhalte im Log, nur technische Phasen + Dauer.
  const correlationId = crypto.randomUUID();
  const t0 = performance.now();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.info(`[hufi-agent][${correlationId}] abgebrochen: nicht angemeldet`);
    throw new Error("Nicht angemeldet");
  }

  let res: Response;
  try {
    res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-agent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Correlation-Id": correlationId,
        },
        body: JSON.stringify({
          text: params.text,
          voiceMode: params.voiceMode ?? false,
          history: params.history ?? [],
          route: params.route,
          clientTimestamp: params.clientTimestamp ?? new Date().toISOString(),
          clientTimezone: params.clientTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientLocation: params.clientLocation,
          conversationFocus: params.conversationFocus,
          correlationId,
        }),
        signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
      },
    );
  } catch (fetchErr) {
    const name = (fetchErr as Error)?.name;
    const durationMs = Math.round(performance.now() - t0);
    if (name === "TimeoutError" || name === "AbortError") {
      console.warn(`[hufi-agent][${correlationId}] Zeitüberschreitung nach ${durationMs}ms`);
      throw new Error(`Zeitüberschreitung nach ${AGENT_TIMEOUT_MS}ms`);
    }
    console.warn(`[hufi-agent][${correlationId}] nicht erreichbar nach ${durationMs}ms:`, name);
    throw new Error(`Hufi-Agent nicht erreichbar: ${(fetchErr as Error).message}`);
  }

  let json: HufiAgentResponse | null = null;
  try {
    json = await res.json() as HufiAgentResponse;
  } catch {
    console.warn(`[hufi-agent][${correlationId}] Statuscode ${res.status}, ungültige Antwort`);
    throw new Error(`Hufi-Agent ${res.status}: Ungültige Antwort`);
  }

  const durationMs = Math.round(performance.now() - t0);
  console.info(`[hufi-agent][${correlationId}] Statuscode ${res.status}, ${durationMs}ms, source=${json?.source ?? "?"}`);

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? `Hufi-Agent ${res.status}`);
  }

  return json;
}
