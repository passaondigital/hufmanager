// Zentrale Bestätigungslogik für den Prototyp — eine Aktion braucht eine
// Bestätigung oder nicht, und das steht an genau einer Stelle im Code statt
// implizit über Komponentenauswahl verstreut zu sein. Für die spätere
// Anbindung an echtes Voice-/Backend-Handling kann dieselbe Map einfach um
// echte Aktions-IDs erweitert werden.
export interface HufiActionPolicyEntry {
  label: string;
  requiresConfirmation: boolean;
}

export type HufiActionId =
  | "observation.save"
  | "invoice.prepareDraft"
  | "appointment.openPreparation"
  | "appointment.showRoute"
  | "appointment.contactCustomer"
  | "appointment.openHorseRecord"
  | "ambiguous.selectHorse"
  | "proactive.addAddress"
  | "proactive.askCustomer"
  | "proactive.remindLater";

export const HUFI_ACTION_POLICY: Record<HufiActionId, HufiActionPolicyEntry> = {
  // Bestätigung erforderlich — verändert oder speichert etwas.
  "observation.save": { label: "Beobachtung speichern", requiresConfirmation: true },
  "invoice.prepareDraft": { label: "Rechnungsentwurf vorbereiten", requiresConfirmation: true },
  "proactive.addAddress": { label: "Adresse ergänzen", requiresConfirmation: true },
  "proactive.askCustomer": { label: "Kundin fragen", requiresConfirmation: true },

  // Ohne Bestätigung möglich — zeigt nur an, sucht, bereitet eine Vorschau
  // vor oder berechnet eine Route.
  "appointment.openPreparation": { label: "Terminvorbereitung öffnen", requiresConfirmation: false },
  "appointment.showRoute": { label: "Route anzeigen", requiresConfirmation: false },
  "appointment.contactCustomer": { label: "Kundin kontaktieren", requiresConfirmation: false },
  "appointment.openHorseRecord": { label: "Pferdeakte öffnen", requiresConfirmation: false },
  "ambiguous.selectHorse": { label: "Pferd auswählen", requiresConfirmation: false },
  "proactive.remindLater": { label: "Später erinnern", requiresConfirmation: false },
};

export function requiresConfirmation(actionId: HufiActionId): boolean {
  return HUFI_ACTION_POLICY[actionId].requiresConfirmation;
}
