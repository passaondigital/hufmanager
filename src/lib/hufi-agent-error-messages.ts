import { HufiAgentClientError } from "@/lib/hufi-agent-client-error";
import type { HufiErrorCategory } from "@/components/assistant/hufi-experience";

// Bekannte Backend-Fehlercodes aus supabase/functions/hufi-agent/index.ts
// (ProviderErrorCode) -- rein informativer Typ-Alias, keine Laufzeitprüfung,
// da der Client den Code nur als string erhält.
export type KnownHufiAgentErrorCode =
  | "anthropic_not_configured"
  | "anthropic_auth_failed"
  | "anthropic_model_not_found"
  | "anthropic_rate_limited"
  | "anthropic_credit_exhausted"
  | "anthropic_bad_request"
  | "anthropic_timeout"
  | "anthropic_upstream_error"
  | "empty_provider_response"
  | "ollama_unavailable"
  | "all_providers_failed";

export interface HufiAgentErrorClassification {
  category: HufiErrorCategory;
  text: string;
}

/**
 * Reine Ableitung einer sichtbaren, ehrlichen Nutzermeldung aus einem
 * askHufiAgent()-Fehler. Kein Seiteneffekt, kein Netzwerkzugriff -- testbar
 * mit kontrollierten Fehlerobjekten. "Hufi-Agent nicht erreichbar" und
 * "Keine Verbindung" bleiben reserviert für kind "agent"/"network", NIE für
 * einen bekannten Billing- oder Provider-Fehlercode.
 */
export function classifyHufiAgentError(err: unknown, options: { voiceMode?: boolean } = {}): HufiAgentErrorClassification {
  const voiceMode = options.voiceMode ?? false;
  const e = err as Error;
  const agentError = err instanceof HufiAgentClientError ? err : null;

  if (agentError?.kind === "auth") {
    return { category: "action", text: "Dafür musst du angemeldet sein." };
  }

  if (agentError?.kind === "network") {
    return { category: "network", text: "Keine Netzwerkverbindung zum Hufi-Agent. Bitte prüfe deine Verbindung und versuche es erneut." };
  }

  if (agentError?.kind === "timeout") {
    return { category: "agent", text: "Hufi-Agent antwortet gerade nicht rechtzeitig. Bitte gleich nochmal versuchen." };
  }

  if (agentError?.kind === "function") {
    switch (agentError.errorCode as KnownHufiAgentErrorCode | undefined) {
      case "anthropic_credit_exhausted":
        return { category: "billing", text: "Hufis KI-Dienst hat aktuell kein verfügbares Guthaben." };
      case "anthropic_auth_failed":
      case "anthropic_not_configured":
        return { category: "provider", text: "Hufis KI-Zugang hat gerade ein Konfigurationsproblem. Bitte versuche es später erneut." };
      case "anthropic_rate_limited":
        return { category: "provider", text: "Hufi ist gerade stark ausgelastet. Bitte kurz warten und erneut versuchen." };
      case "anthropic_model_not_found":
      case "anthropic_bad_request":
        return { category: "provider", text: "Hufis KI-Dienst hat gerade ein technisches Problem. Bitte gleich nochmal versuchen." };
      case "anthropic_timeout":
        return { category: "provider", text: "Hufis KI-Dienst antwortet gerade nicht rechtzeitig. Bitte gleich nochmal versuchen." };
      default:
        // anthropic_upstream_error, empty_provider_response, ollama_unavailable,
        // all_providers_failed oder ein unbekannter/fehlender Code -- ehrlich
        // generisch, aber weiterhin "agent" statt "network".
        return { category: "agent", text: "Hufis Antwortdienst ist gerade nicht verfügbar. Bitte gleich nochmal versuchen." };
    }
  }

  if (agentError?.kind === "http" || agentError?.kind === "invalid_response") {
    return { category: "agent", text: "Hufi hat eine technische Antwort erhalten, die nicht verarbeitet werden konnte. Bitte gleich nochmal versuchen." };
  }

  if (e?.message?.includes("Kein KI-Guthaben")) {
    return {
      category: "action",
      text: voiceMode
        ? "Dein KI-Guthaben ist erschöpft."
        : "Dein KI-Guthaben ist aufgebraucht. Bitte lade es in den Einstellungen auf.",
    };
  }

  if (e?.message?.includes("Nicht angemeldet") || e?.message?.includes("401")) {
    return { category: "action", text: "Dafür musst du angemeldet sein." };
  }

  if (e?.message?.includes("Zeitüberschreitung")) {
    return {
      category: "agent",
      text: voiceMode
        ? "Hufi antwortet gerade nicht. Bitte gleich nochmal."
        : "Hufi-Agent antwortet nicht (Zeitüberschreitung). Bitte erneut versuchen.",
    };
  }

  if (e?.message?.includes("Ollama") || e?.message?.includes("fetch") || e?.message?.includes("nicht erreichbar")) {
    return {
      category: "agent",
      text: voiceMode
        ? "Verbindung kurz unterbrochen. Bitte gleich nochmal."
        : "Verbindung fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  return {
    category: "unknown",
    text: voiceMode
      ? "Ich konnte deine Anfrage nicht verarbeiten. Bitte erneut versuchen."
      : `Anfrage fehlgeschlagen. Bitte erneut versuchen.${import.meta.env.DEV ? ` (${e?.message})` : ""}`,
  };
}
