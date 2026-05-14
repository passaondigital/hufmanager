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

export interface HufiAgentResponse {
  ok: boolean;
  answer: string;
  spokenText: string;
  source: "claude" | "ollama" | "none";
  error?: string;
  actionPlan?: HufiActionPlan;
}

export async function askHufiAgent(params: {
  text: string;
  voiceMode?: boolean;
  history?: HufiAgentMessage[];
  route?: string;
  mode?: "chat" | "action";
  clientTimestamp?: string;
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
