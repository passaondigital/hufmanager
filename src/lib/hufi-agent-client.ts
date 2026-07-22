import { supabase } from "@/integrations/supabase/client";

export interface HufiAgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HufiActionPlan {
  taskType: string;
  payload: Record<string, unknown>;
  explanation: string;
  confirmText: string;
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
  source: "claude" | "ollama" | "none";
  error?: string;
  actionPlan?: HufiActionPlan;
  pendingConfirmation?: HufiPendingConfirmation;
}

export async function askHufiAgent(params: {
  text: string;
  voiceMode?: boolean;
  history?: HufiAgentMessage[];
  route?: string;
  mode?: "chat" | "action";
  clientTimestamp?: string;
  clientTimezone?: string;
  clientLocation?: { lat: number; lon: number };
}): Promise<HufiAgentResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
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
        },
        body: JSON.stringify({
          text: params.text,
          voiceMode: params.voiceMode ?? false,
          history: params.history ?? [],
          route: params.route,
          mode: params.mode ?? "chat",
          clientTimestamp: params.clientTimestamp ?? new Date().toISOString(),
          clientTimezone: params.clientTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientLocation: params.clientLocation,
        }),
      },
    );
  } catch (fetchErr) {
    throw new Error(`Hufi-Agent nicht erreichbar: ${(fetchErr as Error).message}`);
  }

  let json: HufiAgentResponse | null = null;
  try {
    json = await res.json() as HufiAgentResponse;
  } catch {
    throw new Error(`Hufi-Agent ${res.status}: Ungültige Antwort`);
  }

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? `Hufi-Agent ${res.status}`);
  }

  return json;
}
