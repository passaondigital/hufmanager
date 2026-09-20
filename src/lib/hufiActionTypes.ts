/**
 * Alle Aktionstypen, die executeHufiAction (hufi-actions.ts) wirklich
 * ausführen kann.
 *
 * P1-3 (Correction Pass 5): bewusst eine Laufzeit-Liste, nicht nur eine
 * Typ-Union, und bewusst in einer eigenen, importfreien Datei. Genau an
 * diesem Vertrag ist create_contact gescheitert — das Agent-Tool war im
 * Katalog beworben und bestätigungspflichtig eingetragen, hatte aber keinen
 * Ausführungspfad, und es gab nichts, wogegen sich das hätte prüfen lassen.
 * Ohne Importe (hufi-actions.ts zieht den Supabase-Client und damit
 * window-abhängigen Code nach) bleibt die Liste aus Tests heraus ladbar —
 * siehe hufiAgentMutatingTools.test.ts.
 */
export const HUFI_ACTION_TYPES = [
  "create_appointment",
  "update_appointment",
  "cancel_appointment",
  "send_invoice",
  "notify_client",
  "create_note",
  "request_permission",
  "remind_dsgvo",
  "escalate_emergency",
  "set_price_group",
  "add_expense",
  "create_customer",
] as const;

export type HufiActionType = typeof HUFI_ACTION_TYPES[number];
