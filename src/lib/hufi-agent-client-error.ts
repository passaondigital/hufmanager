// Eigene, abhängigkeitsfreie Datei fuer HufiAgentClientError: hufi-agent-client.ts
// importiert transitiv den echten Supabase-Client (Modul-Nebeneffekt via
// localStorage), was reine Unit-Tests der Fehlerklassifizierung ohne
// jsdom-Umgebung zum Absturz bringt. Diese Klasse selbst braucht nichts davon.
export type HufiAgentClientErrorKind = "auth" | "network" | "timeout" | "http" | "function" | "invalid_response";

export class HufiAgentClientError extends Error {
  constructor(
    message: string,
    readonly kind: HufiAgentClientErrorKind,
    readonly status?: number,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = "HufiAgentClientError";
  }
}
