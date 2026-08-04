// HufiCapabilityRegistry — zentrale, maschinenlesbare Wahrheit über das, was
// Hufi WIRKLICH kann (P0 Abschnitt 7-9). Jeder Eintrag verweist auf einen
// echten Handler (Tool-Name aus HUFI_TOOLS, Navigation-Route aus
// hufi-nav-actions.ts, oder eine UI-Komponente) -- nichts wird hier als
// verfügbar markiert, ohne dass der Handler tatsächlich existiert.
//
// Wird unten in buildCapabilitySummary() zu einem kompakten Textblock für
// den Systemprompt verdichtet, damit Hufi Fragen wie "Was kannst du?" oder
// "Kannst du X?" ausschließlich anhand dieser Liste beantwortet -- nicht
// anhand pauschaler Werbetexte oder erfundener Fähigkeiten.

export type CapabilityCategory =
  | "navigation" | "termine" | "kunden" | "pferde" | "rechnungen"
  | "beobachtungen" | "medien" | "konto";

export interface HufiCapability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  kind: "read" | "write";
  /** Was Hufi vom Nutzer noch braucht, um das auszuführen (leer = nichts). */
  requiredInputs: string[];
  /** Echter Handler: Tool-Name (HUFI_TOOLS) oder "nav:<route>" oder Klartext-Verweis auf eine UI-Komponente. */
  handler: string;
  /** Zielroute, falls es sich um Navigation handelt. */
  route?: string;
  confirmationRequired: boolean;
  available: boolean;
  /** Nur gesetzt, wenn available === false. */
  unavailableReason?: string;
}

export const HUFI_CAPABILITIES: HufiCapability[] = [
  // ── Navigation (read-only, keine Bestätigung nötig) ──────────────────────
  {
    id: "open_module", name: "Seite/Modul öffnen",
    description: "Zu einem Bereich der App navigieren (Kalender, Kunden, Pferde, Rechnungen, Einstellungen, …).",
    category: "navigation", kind: "read", requiredInputs: [],
    handler: "nav:runNavAction", confirmationRequired: false, available: true,
  },
  {
    id: "view_appointments", name: "Termine anzeigen",
    description: "Kalender/Terminliste öffnen oder Termine der nächsten Tage abfragen.",
    category: "termine", kind: "read", requiredInputs: [],
    handler: "get_appointments", route: "/kalender", confirmationRequired: false, available: true,
  },
  {
    id: "open_appointment", name: "Termin öffnen",
    description: "Einen einzelnen, konkreten Termin per Sprache direkt öffnen.",
    category: "termine", kind: "read", requiredInputs: [],
    handler: "none", confirmationRequired: false, available: false,
    unavailableReason: "Kein Sprach-Handler für eine einzelne Termin-ID -- nur die Terminliste ist per Sprache erreichbar.",
  },
  {
    id: "create_appointment", name: "Termin erstellen",
    description: "Einen neuen Termin anlegen (Datum, Uhrzeit, Kunde/Pferd).",
    category: "termine", kind: "write", requiredInputs: ["Datum", "Uhrzeit", "Kunde oder Pferd"],
    handler: "create_appointment", confirmationRequired: true, available: true,
  },
  {
    id: "update_appointment", name: "Termin ändern",
    description: "Einen bestehenden Termin verschieben oder Details anpassen.",
    category: "termine", kind: "write", requiredInputs: ["welcher Termin", "was sich ändert"],
    handler: "update_appointment", confirmationRequired: true, available: true,
  },
  {
    id: "cancel_appointment", name: "Termin absagen",
    description: "Einen bestehenden Termin absagen.",
    category: "termine", kind: "write", requiredInputs: ["welcher Termin"],
    handler: "cancel_appointment", confirmationRequired: true, available: true,
  },
  {
    id: "search_customer", name: "Kundschaft suchen/öffnen",
    description: "Nach Name suchen und Kundenakte öffnen.",
    category: "kunden", kind: "read", requiredInputs: ["Name oder Teil des Namens"],
    handler: "search_entity", route: "/kunden", confirmationRequired: false, available: true,
  },
  {
    id: "create_customer", name: "Kundschaft anlegen",
    description: "Einen neuen Kundeneintrag anlegen.",
    category: "kunden", kind: "write", requiredInputs: ["Name"],
    handler: "none", confirmationRequired: true, available: false,
    unavailableReason: "create_contact hat noch keinen echten Ausführungspfad (Claude bekommt eine Absage statt einer stillen Aktion).",
  },
  {
    id: "search_horse", name: "Pferde suchen/öffnen",
    description: "Nach Name suchen und Pferdeakte öffnen.",
    category: "pferde", kind: "read", requiredInputs: ["Name oder Teil des Namens"],
    handler: "search_entity", route: "/pferde", confirmationRequired: false, available: true,
  },
  {
    id: "create_horse", name: "Pferd anlegen",
    description: "Ein neues Pferd anlegen.",
    category: "pferde", kind: "write", requiredInputs: ["Name", "Besitzer"],
    handler: "none", confirmationRequired: true, available: false,
    unavailableReason: "create_horse hat noch keinen echten Ausführungspfad (Claude bekommt eine Absage statt einer stillen Aktion).",
  },
  {
    id: "view_invoices", name: "Rechnungen anzeigen",
    description: "Rechnungsliste öffnen oder Rechnungshistorie abfragen.",
    category: "rechnungen", kind: "read", requiredInputs: [],
    handler: "get_invoice_history", route: "/rechnungen", confirmationRequired: false, available: true,
  },
  {
    id: "view_open_invoices", name: "Offene Rechnungen prüfen",
    description: "Nur unbezahlte/überfällige Rechnungen abfragen.",
    category: "rechnungen", kind: "read", requiredInputs: [],
    handler: "get_invoice_history", route: "/rechnungen", confirmationRequired: false, available: true,
  },
  {
    id: "create_invoice", name: "Rechnung erstellen",
    description: "Einen Rechnungsentwurf für einen Termin/Kunden anlegen.",
    category: "rechnungen", kind: "write", requiredInputs: ["Kunde oder Termin", "Leistung/Betrag"],
    handler: "create_invoice", confirmationRequired: true, available: true,
  },
  {
    id: "create_observation", name: "Beobachtung erfassen",
    description: "Eine Notiz/Beobachtung zu einem Pferd speichern.",
    category: "beobachtungen", kind: "write", requiredInputs: ["Pferd", "Beobachtungstext"],
    handler: "create_note", confirmationRequired: true, available: true,
  },
  {
    id: "open_camera", name: "Kamera öffnen",
    description: "HM-CAM zur Fotoaufnahme öffnen (z. B. für Hufbilder).",
    category: "medien", kind: "read", requiredInputs: [],
    handler: "HMCamModal (Tippen auf den Kamera-Knopf)", confirmationRequired: false, available: true,
    unavailableReason: "Per Tippen verfügbar, aber noch kein Sprachbefehl dafür verkabelt.",
  },
  {
    id: "pick_image", name: "Bild auswählen",
    description: "Ein vorhandenes Bild aus der Galerie hochladen und auswerten.",
    category: "medien", kind: "write", requiredInputs: [],
    handler: "none", confirmationRequired: false, available: false,
    unavailableReason: "Kein Verarbeitungspfad ab dem Hufi-Screen -- der Knopf ist bewusst deaktiviert statt simuliert.",
  },
  {
    id: "pick_document", name: "Dokument auswählen",
    description: "Ein Dokument (z. B. PDF) hochladen und auswerten.",
    category: "medien", kind: "write", requiredInputs: [],
    handler: "none", confirmationRequired: false, available: false,
    unavailableReason: "Kein Verarbeitungspfad ab dem Hufi-Screen -- der Knopf ist bewusst deaktiviert statt simuliert.",
  },
  {
    id: "open_settings", name: "Einstellungen öffnen",
    description: "Die Einstellungen öffnen.",
    category: "konto", kind: "read", requiredInputs: [],
    handler: "nav:open_settings", route: "/einstellungen", confirmationRequired: false, available: true,
  },
  {
    id: "open_profile", name: "Profil öffnen",
    description: "Das eigene Profil öffnen.",
    category: "konto", kind: "read", requiredInputs: [],
    handler: "nav:open_profile", route: "/management/profil", confirmationRequired: false, available: true,
  },
  {
    id: "open_voice_credits", name: "Voice-Guthaben öffnen",
    description: "Das Voice-Guthaben (Premium-Sprachausgabe) öffnen.",
    category: "konto", kind: "read", requiredInputs: [],
    handler: "nav:open_voice_credits", route: "/management/guthaben", confirmationRequired: false, available: true,
  },
  {
    id: "open_subscription", name: "Abo öffnen",
    description: "Das eigene Abo/Paket öffnen.",
    category: "konto", kind: "read", requiredInputs: [],
    handler: "nav:open_subscription", route: "/management/abo", confirmationRequired: false, available: true,
  },
  {
    id: "open_help", name: "Hilfe öffnen",
    description: "Die Hilfe/FAQ öffnen.",
    category: "konto", kind: "read", requiredInputs: [],
    handler: "nav:open_help", route: "/hilfe", confirmationRequired: false, available: true,
  },
];

// Kompakter, für den Systemprompt geeigneter Textblock -- eine Zeile pro
// Fähigkeit, gruppiert nach verfügbar/nicht verfügbar. Bewusst ohne JSON,
// damit Claude das direkt als Antwortgrundlage lesen kann.
export function buildCapabilitySummary(): string {
  const available = HUFI_CAPABILITIES.filter((c) => c.available);
  const unavailable = HUFI_CAPABILITIES.filter((c) => !c.available);

  const line = (c: HufiCapability) => {
    const parts = [`- ${c.name} (${c.kind === "write" ? "schreibend" : "lesend"}${c.confirmationRequired ? ", braucht Bestätigung" : ""}): ${c.description}`];
    if (c.requiredInputs.length) parts.push(`  Braucht dafür: ${c.requiredInputs.join(", ")}.`);
    return parts.join("\n");
  };
  const unavailLine = (c: HufiCapability) => `- ${c.name}: NICHT verfügbar -- ${c.unavailableReason ?? "kein echter Handler vorhanden"}`;

  return [
    "ECHTE FÄHIGKEITEN VON HUFI (HufiCapabilityRegistry) -- beantworte Fragen nach deinen Fähigkeiten AUSSCHLIESSLICH anhand dieser Liste, nie mit erfundenen Funktionen oder pauschalen Werbetexten:",
    "Verfügbar:",
    available.map(line).join("\n"),
    "Noch NICHT verfügbar (ehrlich benennen, nicht einfach 'kann ich nicht' ohne Grund):",
    unavailable.map(unavailLine).join("\n"),
  ].join("\n");
}
