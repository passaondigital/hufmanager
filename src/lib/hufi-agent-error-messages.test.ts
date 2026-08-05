import { describe, expect, it } from "vitest";
import { HufiAgentClientError } from "./hufi-agent-client-error";
import { classifyHufiAgentError } from "./hufi-agent-error-messages";

const AGENT_UNREACHABLE_TEXT = "Hufis Antwortdienst ist gerade nicht verfügbar. Bitte gleich nochmal versuchen.";
const NO_CONNECTION_TEXT = "Keine Netzwerkverbindung zum Hufi-Agent. Bitte prüfe deine Verbindung und versuche es erneut.";

function functionError(errorCode: string) {
  return new HufiAgentClientError(`Hufi-Agent 503`, "function", 503, errorCode);
}

describe("classifyHufiAgentError", () => {
  it("maps anthropic_credit_exhausted to the exact required billing text", () => {
    const result = classifyHufiAgentError(functionError("anthropic_credit_exhausted"));
    expect(result.category).toBe("billing");
    expect(result.text).toBe("Hufis KI-Dienst hat aktuell kein verfügbares Guthaben.");
  });

  it.each([
    ["anthropic_auth_failed"],
    ["anthropic_not_configured"],
    ["anthropic_rate_limited"],
    ["anthropic_model_not_found"],
    ["anthropic_bad_request"],
    ["anthropic_timeout"],
  ])("maps known provider errorCode %s to category provider, never agent/network text", (code) => {
    const result = classifyHufiAgentError(functionError(code));
    expect(result.category).toBe("provider");
    expect(result.text).not.toBe(AGENT_UNREACHABLE_TEXT);
    expect(result.text).not.toBe(NO_CONNECTION_TEXT);
    expect(result.text.toLowerCase()).not.toContain("nicht erreichbar");
    expect(result.text.toLowerCase()).not.toContain("keine verbindung");
  });

  it("keeps unknown/unclassified function errors on the generic agent fallback", () => {
    const knownProvider = classifyHufiAgentError(functionError("anthropic_upstream_error"));
    expect(knownProvider.category).toBe("agent");
    expect(knownProvider.text).toBe(AGENT_UNREACHABLE_TEXT);

    const noCode = classifyHufiAgentError(functionError(undefined as unknown as string));
    expect(noCode.category).toBe("agent");
  });

  it("keeps real network failures on category network with the connection text", () => {
    const result = classifyHufiAgentError(new HufiAgentClientError("Keine Netzwerkverbindung zum Hufi-Agent.", "network"));
    expect(result.category).toBe("network");
    expect(result.text).toBe(NO_CONNECTION_TEXT);
  });

  it("keeps client-side fetch timeout on category agent (distinct from server-side provider timeout)", () => {
    const result = classifyHufiAgentError(new HufiAgentClientError("Hufi-Agent antwortet nicht rechtzeitig.", "timeout"));
    expect(result.category).toBe("agent");
  });

  it("keeps auth kind on category action", () => {
    const result = classifyHufiAgentError(new HufiAgentClientError("Nicht angemeldet", "auth", 401));
    expect(result.category).toBe("action");
    expect(result.text).toBe("Dafür musst du angemeldet sein.");
  });

  it("keeps http/invalid_response kinds on category agent", () => {
    expect(classifyHufiAgentError(new HufiAgentClientError("Hufi-Agent 500", "http", 500)).category).toBe("agent");
    expect(classifyHufiAgentError(new HufiAgentClientError("Ungültige Antwort", "invalid_response", 200)).category).toBe("agent");
  });

  it("preserves the legacy voiceMode-specific texts for pre-existing message-based fallbacks", () => {
    const creditError = new Error("Kein KI-Guthaben mehr vorhanden");
    expect(classifyHufiAgentError(creditError, { voiceMode: true }).text).toBe("Dein KI-Guthaben ist erschöpft.");
    expect(classifyHufiAgentError(creditError, { voiceMode: false }).text).toBe("Dein KI-Guthaben ist aufgebraucht. Bitte lade es in den Einstellungen auf.");
  });

  it("falls back to category unknown for an unrecognized plain error", () => {
    const result = classifyHufiAgentError(new Error("irgendwas Unerwartetes"));
    expect(result.category).toBe("unknown");
  });
});
