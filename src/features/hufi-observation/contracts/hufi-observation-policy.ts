import type { ObservationSource } from "./hufi-observation-input";

// ── Policy-Matrix als Code ───────────────────────────────────────────────
//
// Reine Konfiguration, KEINE Ausführungslogik — wird von der künftigen
// Ausführungsschicht (Edge Function/RPC) gelesen, nicht hier entschieden.
// Werte begründet aus docs/hufi-observation-phase-1-contracts.md
// Abschnitt 14.

export type HufiObservationRiskLevel = "low" | "medium" | "high";

export interface HufiObservationPolicy {
  action: string;
  riskLevel: HufiObservationRiskLevel;
  requiresConfirmation: boolean;
  requiresServerAuthorization: boolean;
  auditable: boolean;
  reversible: boolean;
  idempotent: boolean;
  /** Beschreibendes Berechtigungs-Kürzel, orientiert an den bestehenden
   * has_role()/is_provider_for_horse()-Prüfungen — kein neues
   * Rollen-/Permission-System, nur eine lesbare Kennzeichnung dessen, was
   * die künftige serverseitige Prüfung verlangen muss. */
  requiredPermission: string;
  allowedSources: ObservationSource[];
  /** Nur bei Policies mit bekannten, heute ungelösten Einschränkungen
   * gesetzt (z.B. undo_observation) — macht offene Punkte im Code selbst
   * sichtbar statt nur in der Doku. */
  note?: string;
}

const ALL_SOURCES: ObservationSource[] = [
  "text",
  "voice",
  "camera",
  "image",
  "document",
];

export const HUFI_OBSERVATION_POLICIES: Record<string, HufiObservationPolicy> = {
  create_observation_proposal: {
    action: "create_observation_proposal",
    riskLevel: "low",
    requiresConfirmation: false,
    requiresServerAuthorization: true, // Pferd-Kandidaten müssen zugriffsgescoped sein
    auditable: false,
    reversible: true,
    idempotent: true,
    requiredPermission: "provider:observation:propose",
    allowedSources: ALL_SOURCES,
  },

  resolve_horse_exact: {
    action: "resolve_horse_exact",
    riskLevel: "low",
    requiresConfirmation: false,
    requiresServerAuthorization: true,
    auditable: false,
    reversible: true,
    idempotent: true,
    requiredPermission: "provider:horse:read",
    allowedSources: ALL_SOURCES,
  },

  request_horse_selection: {
    action: "request_horse_selection",
    riskLevel: "low",
    requiresConfirmation: false,
    requiresServerAuthorization: true,
    auditable: false,
    reversible: true,
    idempotent: true,
    requiredPermission: "provider:horse:read",
    allowedSources: ALL_SOURCES,
  },

  save_observation: {
    action: "save_observation",
    riskLevel: "high",
    requiresConfirmation: true,
    requiresServerAuthorization: true,
    auditable: true,
    // Kein Undo-Muster für hoof_entries/hoof_analyses heute vorhanden
    // (docs/hufi-observation-workflow-analysis.md Abschnitt 21, Punkt 9).
    reversible: false,
    idempotent: true, // via idempotencyKey, siehe hufi-observation-input.ts
    requiredPermission: "provider:hoof_entries:write",
    allowedSources: ALL_SOURCES,
  },

  create_follow_up: {
    action: "create_follow_up",
    riskLevel: "medium",
    requiresConfirmation: true,
    requiresServerAuthorization: true,
    auditable: true,
    reversible: true, // Status kann auf "dismissed" gesetzt werden
    idempotent: true,
    requiredPermission: "provider:followup:write",
    allowedSources: ALL_SOURCES,
  },

  overwrite_existing_observation: {
    action: "overwrite_existing_observation",
    riskLevel: "high",
    requiresConfirmation: true,
    requiresServerAuthorization: true,
    auditable: true,
    reversible: false,
    // Bewusst false: ein Überschreiben ist nicht automatisch sicher
    // wiederholbar (welcher Stand gilt bei zweifachem Retry?) — verlangt
    // in der nächsten Bauphase eine explizite Versionsprüfung, nicht nur
    // den generischen idempotencyKey.
    idempotent: false,
    requiredPermission: "provider:hoof_entries:write",
    allowedSources: ALL_SOURCES,
    note: "Idempotenz für Überschreiben ist in dieser Phase ungelöst — zusätzliche Versionsprüfung nötig, bevor produktiv nutzbar.",
  },

  cancel_action: {
    action: "cancel_action",
    riskLevel: "low",
    requiresConfirmation: false,
    requiresServerAuthorization: true, // nur der Urheber darf abbrechen
    auditable: true,
    reversible: true,
    idempotent: true,
    requiredPermission: "provider:action:cancel",
    allowedSources: ALL_SOURCES,
  },

  retry_action: {
    action: "retry_action",
    riskLevel: "medium",
    requiresConfirmation: false,
    requiresServerAuthorization: true,
    auditable: true,
    reversible: true,
    idempotent: true, // zwingend — sonst wäre Retry nicht sicher
    requiredPermission: "provider:action:retry",
    allowedSources: ALL_SOURCES,
  },

  undo_observation: {
    action: "undo_observation",
    riskLevel: "high",
    requiresConfirmation: true,
    requiresServerAuthorization: true,
    auditable: true,
    reversible: true,
    idempotent: true,
    requiredPermission: "provider:hoof_entries:write",
    allowedSources: ALL_SOURCES,
    note: "Heute technisch NICHT umsetzbar — kein Undo-/Soft-Delete-Muster für hoof_entries/hoof_analyses im Schema. Policy vorbereitet, Ausführung fehlt.",
  },
};
