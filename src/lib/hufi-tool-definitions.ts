import type { AgentTaskType } from "./hufi-agent-tasks";

export interface ClaudeToolProperty {
  type: string;
  description?: string;
  items?: Record<string, unknown>;
  properties?: Record<string, ClaudeToolProperty>;
  required?: string[];
}

export interface ClaudeToolInputSchema {
  type: "object";
  properties: Record<string, ClaudeToolProperty>;
  required?: string[];
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: ClaudeToolInputSchema;
}

const todayIso = () => new Date().toISOString().split("T")[0];

export const HUFI_TOOLS: ClaudeTool[] = [
  {
    name: "create_appointment",
    description:
      "Einen Termin für ein Pferd oder einen Kunden im Kalender anlegen. " +
      "Verwende dieses Tool wenn der Nutzer einen Termin planen, buchen, eintragen oder vereinbaren möchte.",
    input_schema: {
      type: "object",
      properties: {
        horse_name:   { type: "string", description: "Name des Pferdes" },
        client_name:  { type: "string", description: "Name des Besitzers / Kunden" },
        date:         { type: "string", description: `Datum im Format YYYY-MM-DD. Heute ist ${todayIso()}.` },
        time:         { type: "string", description: "Uhrzeit im Format HH:MM (optional)" },
        service_type: { type: "string", description: "Art der Leistung, z.B. 'Hufpflege', 'Beschlag', 'Klebebeschlag'" },
        notes:        { type: "string", description: "Zusätzliche Hinweise (optional)" },
      },
      required: ["date"],
    },
  },
  {
    name: "create_invoice",
    description:
      "Einen Rechnungsentwurf mit Positionen erstellen. " +
      "Verwende dieses Tool wenn der Nutzer eine Rechnung erstellen, abrechnen oder in Rechnung stellen möchte. " +
      "Extrahiere alle genannten Positionen (Leistungen + Materialien) als line_items. " +
      "Verwende inventory_item_id aus dem bereitgestellten Lager-Katalog wenn ein Artikel dort vorhanden ist. " +
      "Wenn kein Preis genannt wird, nutze den Preis aus dem Katalog oder setze 0.",
    input_schema: {
      type: "object",
      properties: {
        horse_name:  { type: "string", description: "Name des Pferdes (falls bekannt)" },
        client_name: { type: "string", description: "Name des Kunden" },
        line_items: {
          type: "array",
          description: "Alle Rechnungspositionen (Leistungen und Materialien)",
          items: {
            type: "object",
            properties: {
              title:             { type: "string",  description: "Bezeichnung der Position" },
              quantity:          { type: "number",  description: "Menge (z.B. 1, 2, 4)" },
              unit_price:        { type: "number",  description: "Einzelpreis netto in EUR/CHF" },
              inventory_item_id: { type: "string",  description: "ID aus dem Lager-Katalog (optional, nur wenn vorhanden)" },
            },
            required: ["title", "quantity", "unit_price"],
          },
        },
        notes: { type: "string", description: "Notiz oder Freitext zur Rechnung" },
      },
    },
  },
  {
    name: "create_note",
    description:
      "Eine Notiz, Beobachtung oder einen Befund zu einem Pferd oder Kunden speichern. " +
      "Verwende dieses Tool für Befunde, Auffälligkeiten, Hinweise oder freie Notizen.",
    input_schema: {
      type: "object",
      properties: {
        horse_name:  { type: "string", description: "Name des Pferdes (falls relevant)" },
        client_name: { type: "string", description: "Name des Kunden (falls relevant)" },
        note_text:   { type: "string", description: "Inhalt der Notiz" },
      },
      required: ["note_text"],
    },
  },
  {
    name: "set_reminder",
    description:
      "Eine Erinnerung oder Aufgabe setzen. " +
      "Verwende dieses Tool wenn der Nutzer an etwas erinnert werden möchte oder eine Aufgabe erstellen will.",
    input_schema: {
      type: "object",
      properties: {
        message:    { type: "string", description: "Inhalt der Erinnerung" },
        date:       { type: "string", description: `Datum der Erinnerung YYYY-MM-DD (optional). Heute ist ${todayIso()}.` },
        horse_name: { type: "string", description: "Bezug zu einem Pferd (optional)" },
      },
      required: ["message"],
    },
  },
  {
    name: "add_expense",
    description:
      "Eine Ausgabe oder einen Beleg erfassen. " +
      "Verwende dieses Tool wenn der Nutzer eine Ausgabe, einen Einkauf, eine Betriebskosten oder einen Beleg erfassen möchte.",
    input_schema: {
      type: "object",
      properties: {
        amount:      { type: "number",  description: "Betrag in EUR/CHF" },
        category:    { type: "string",  description: "Kategorie: 'material', 'fahrtkosten', 'werkzeug', 'versicherung', 'sonstiges'" },
        description: { type: "string",  description: "Beschreibung der Ausgabe" },
        date:        { type: "string",  description: `Datum YYYY-MM-DD. Heute ist ${todayIso()}.` },
      },
      required: ["amount", "description"],
    },
  },
  {
    name: "set_price_group",
    description:
      "Einem Kunden eine Preisgruppe zuweisen. " +
      "Verwende dieses Tool wenn der Nutzer sagt: 'Müller ist ein VIP-Kunde', 'Schmidt gehört zur Großstall-Gruppe', " +
      "'setz Meier auf Individuell' oder ähnlich. " +
      "Verfügbare Gruppen: standard (Normalpreis), vip (VIP-Kunden), grossstall (Großstallbetriebe), individuell (individuelle Vereinbarung).",
    input_schema: {
      type: "object",
      properties: {
        client_name:  { type: "string", description: "Name des Kunden" },
        price_group:  { type: "string", description: "Preisgruppe: 'standard', 'vip', 'grossstall' oder 'individuell'" },
        reason:       { type: "string", description: "Begründung für die Zuweisung (optional)" },
      },
      required: ["client_name", "price_group"],
    },
  },
];

export function toolNameToTaskType(toolName: string): AgentTaskType {
  switch (toolName) {
    case "create_appointment": return "create_appointment";
    case "create_invoice":     return "create_invoice";
    case "create_note":        return "create_note";
    case "set_reminder":       return "set_reminder";
    case "add_expense":        return "add_expense";
    case "set_price_group":    return "set_price_group";
    default:                   return "generic_action";
  }
}

export interface InvoiceLineItem {
  title: string;
  quantity: number;
  unit_price: number;
  inventory_item_id?: string | null;
}

export function extractLineItems(input: Record<string, unknown>): InvoiceLineItem[] {
  const raw = input.line_items;
  if (!Array.isArray(raw) || raw.length === 0) {
    // Fallback: single item from old-style amount/service_type
    const title = (input.service_type as string) ?? "Leistung";
    const amount = (input.amount as number) ?? 0;
    if (amount > 0 || title !== "Leistung") {
      return [{ title, quantity: 1, unit_price: amount }];
    }
    return [];
  }
  return raw.map((item) => {
    const i = item as Record<string, unknown>;
    return {
      title:             String(i.title ?? "Position"),
      quantity:          Number(i.quantity ?? 1),
      unit_price:        Number(i.unit_price ?? 0),
      inventory_item_id: (i.inventory_item_id as string | null) ?? null,
    };
  });
}

export function buildToolExplanation(toolName: string, input: Record<string, unknown>): string {
  const horse  = input.horse_name  ? ` für ${input.horse_name}`  : "";
  const client = input.client_name ? ` (${input.client_name})`  : "";
  switch (toolName) {
    case "create_appointment":
      return `Termin${horse}${client} am ${input.date ?? "?"}${input.time ? ` um ${input.time}` : ""}` +
             `${input.service_type ? ` — ${input.service_type}` : ""}`;
    case "create_invoice": {
      const items = extractLineItems(input);
      const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const itemList = items.length > 0
        ? ` (${items.length} Pos., Netto: ${total.toFixed(2)} €)`
        : "";
      return `Rechnung${horse}${client}${itemList}`;
    }
    case "create_note":
      return `Notiz${horse}${client}: ${String(input.note_text ?? "").slice(0, 100)}`;
    case "set_reminder":
      return `Erinnerung: ${String(input.message ?? "").slice(0, 100)}${input.date ? ` am ${input.date}` : ""}`;
    case "add_expense":
      return `Ausgabe: ${String(input.description ?? "")} — ${input.amount ?? 0} €`;
    case "set_price_group": {
      const groupLabels: Record<string, string> = { standard: "Standard", vip: "VIP", grossstall: "Großstall", individuell: "Individuell" };
      const label = groupLabels[String(input.price_group ?? "")] ?? String(input.price_group ?? "");
      return `Preisgruppe "${label}" für ${String(input.client_name ?? "Kunde")} setzen${input.reason ? ` — ${input.reason}` : ""}`;
    }
    default:
      return `Aktion: ${toolName}`;
  }
}
