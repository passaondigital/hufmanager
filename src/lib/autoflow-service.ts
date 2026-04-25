import { supabase } from "@/integrations/supabase/client";
import { chatWithHufAI, BEFUND_SYSTEM_PROMPT, ChatMessage } from "./ai-routing";
import {
  recognizeEntities,
  suggestCorrections,
  buildB2BReportContext,
  getAutoflowActions,
  AutoflowAction,
  CorrectionSuggestion,
} from "./ontology-service";

export interface BefundResult {
  pferd_name: string | null;
  befund_text: string | null;
  massnahme: string | null;
  naechster_termin: string | null;
  fachbegriffe: string[];
  raw_response: string;
  autoflow_actions?: AutoflowAction[];
  corrections?: CorrectionSuggestion[];
}

const EXTRACTION_PROMPT = `Analysiere diese Sprachnotiz und extrahiere einen strukturierten Huf-Befund.
Antworte NUR mit validem JSON, kein Text davor oder danach:

{
  "pferd_name": "Name des Pferdes oder null",
  "befund_text": "Kurze Beschreibung des Befundes",
  "massnahme": "Durchgeführte oder geplante Maßnahme",
  "naechster_termin": "z.B. 'in 6 Wochen' oder null",
  "fachbegriffe": ["Begriff1", "Begriff2"]
}

Transkript:`;

export async function extractBefundFromTranscript(
  transcript: string,
  userId: string,
  horseId?: string
): Promise<BefundResult | null> {
  try {
    // Run ontology enrichment in parallel
    const [entities, corrections] = await Promise.all([
      recognizeEntities(transcript),
      suggestCorrections(transcript),
    ]);

    const ontologyContext = buildB2BReportContext(entities);

    const systemPrompt = ontologyContext
      ? `${BEFUND_SYSTEM_PROMPT}\n\n${ontologyContext}`
      : BEFUND_SYSTEM_PROMPT;

    const userMessage = `${EXTRACTION_PROMPT}\n"${transcript}"`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const raw = await chatWithHufAI(messages, userId);

    // JSON aus Antwort extrahieren
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        pferd_name: null,
        befund_text: transcript,
        massnahme: null,
        naechster_termin: null,
        fachbegriffe: [],
        raw_response: raw,
        autoflow_actions: [],
        corrections,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Derive autoflow actions from recognized entities
    const autoflow_actions = getAutoflowActions(entities);

    const result: BefundResult = {
      pferd_name: parsed.pferd_name ?? null,
      befund_text: parsed.befund_text ?? transcript,
      massnahme: parsed.massnahme ?? null,
      naechster_termin: parsed.naechster_termin ?? null,
      fachbegriffe: Array.isArray(parsed.fachbegriffe) ? parsed.fachbegriffe : [],
      raw_response: raw,
      autoflow_actions,
      corrections,
    };

    // In DB speichern
    await supabase.from("ai_befunde").insert({
      user_id: userId,
      horse_id: horseId ?? null,
      transcript,
      pferd_name: result.pferd_name,
      befund_text: result.befund_text,
      massnahme: result.massnahme,
      naechster_termin: result.naechster_termin,
      fachbegriffe: result.fachbegriffe,
      structured_output: parsed,
      model_used: "hufiai-fast",
      processing_status: "processed",
    });

    return result;
  } catch (err) {
    console.error("[AutoFlow] Befund-Extraktion fehlgeschlagen:", err);
    return null;
  }
}

// Formatiert einen Befund für die Chat-Anzeige
export function formatBefundForChat(befund: BefundResult): string {
  const lines: string[] = [];
  if (befund.pferd_name) lines.push(`🐴 **${befund.pferd_name}**`);
  if (befund.befund_text) lines.push(`📋 ${befund.befund_text}`);
  if (befund.massnahme) lines.push(`🔧 ${befund.massnahme}`);
  if (befund.naechster_termin) lines.push(`📅 Nächster Termin: ${befund.naechster_termin}`);
  if (befund.fachbegriffe.length > 0) lines.push(`🏷️ ${befund.fachbegriffe.join(", ")}`);
  return lines.join("\n") || befund.raw_response;
}
