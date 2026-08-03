// ── Simulierte Bestätigung ───────────────────────────────────────────────
//
// Baut ein Confirmation-Contract-Objekt für confirm/edit/cancel. Es gibt in
// dieser Phase KEINEN Server, der ein echtes confirmationToken ausstellt
// (Abschnitt 9/16 in docs/hufi-observation-phase-1-contracts.md — das wäre
// Teil der künftigen RPC). Der hier erzeugte Token ist deshalb ein reiner
// Platzhalter für die Struktur, KEIN Sicherheitsmerkmal — siehe
// simulate-execution.ts, wo das erneut explizit vermerkt ist.

import {
  HufiObservationConfirmationSchema,
  type ConfirmationDecision,
  type HufiObservationConfirmation,
} from "../contracts/hufi-observation-confirmation";
import type { HufiObservationProposal } from "../contracts/hufi-observation-proposal";
import type { ObservationDraft } from "../contracts/hufi-observation-structure";

export interface BuildConfirmationParams {
  proposal: HufiObservationProposal;
  decision: ConfirmationDecision;
  selectedHorseId?: string;
  editedFields?: Partial<ObservationDraft>;
}

function placeholderConfirmationToken(proposalId: string): string {
  // Mindestlänge 16 laut Contract — reiner Struktur-Platzhalter, siehe
  // Datei-Kommentar oben.
  return `dev-lab-${proposalId}`;
}

export function buildConfirmation(
  params: BuildConfirmationParams,
): HufiObservationConfirmation {
  const confirmation: HufiObservationConfirmation = {
    proposalId: params.proposal.proposalId,
    confirmationId: crypto.randomUUID(),
    decision: params.decision,
    selectedHorseId: params.selectedHorseId,
    editedFields: params.editedFields,
    confirmedAt: new Date().toISOString(),
    confirmationToken: placeholderConfirmationToken(params.proposal.proposalId),
    proposalVersion: 0,
  };
  return HufiObservationConfirmationSchema.parse(confirmation);
}
