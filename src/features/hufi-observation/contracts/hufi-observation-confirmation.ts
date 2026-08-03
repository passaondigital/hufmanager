import { z } from "zod";
import { ObservationDraftSchema } from "./hufi-observation-structure";

// ── Confirmation Contract ────────────────────────────────────────────────
//
// Was der Nutzer zu einem Proposal tatsächlich entschieden hat. Dient als
// Beleg/Protokoll — nicht als Ausführungsauftrag selbst (siehe Execution
// Contract, der serverseitig aus Proposal + Confirmation neu aufgebaut
// wird, nicht 1:1 übernommen).
//
// Berücksichtigte Randfälle (serverseitig durchzusetzen, hier nur die
// Datenfelder, die dafür nötig sind):
//   - abgelaufene Vorschau      → Server vergleicht `confirmedAt` gegen
//                                  `proposal.expiresAt` (CONFIRMATION_EXPIRED)
//   - veränderte Daten zwischen
//     Vorschau und Bestätigung  → `proposalVersion` muss mit der aktuell
//                                  gültigen Version übereinstimmen
//                                  (PROPOSAL_CHANGED)
//   - mehrfaches Bestätigen    → `confirmationId` + `idempotencyKey` aus
//                                  dem Input Contract verhindern doppelte
//                                  Ausführung (DUPLICATE_ACTION)
//   - Bearbeitung vor Bestätigung → decision="edit" trägt die geänderten
//                                  Felder in `editedFields`, decision
//                                  bleibt getrennt von "confirm", damit
//                                  Server weiß, dass er die Werte NICHT
//                                  blind aus dem ursprünglichen Proposal
//                                  übernehmen darf

export const ConfirmationDecisionSchema = z.enum(["confirm", "edit", "cancel"]);
export type ConfirmationDecision = z.infer<typeof ConfirmationDecisionSchema>;

export const HufiObservationConfirmationSchema = z.object({
  proposalId: z.string().uuid(),
  confirmationId: z.string().uuid(),

  decision: ConfirmationDecisionSchema,

  /** Muss bei decision="confirm"/"edit" gesetzt sein — bei "cancel"
   * optional, da der Vorgang dann ohnehin nicht ausgeführt wird. */
  selectedHorseId: z.string().uuid().optional(),

  /** Nur bei decision="edit": die vom Nutzer geänderten Felder der
   * Beobachtung. Partial statt vollem Objekt, damit nur tatsächlich
   * geänderte Felder übertragen werden (kleinere Payload, klarer Diff
   * fürs Audit). */
  editedFields: ObservationDraftSchema.partial().optional(),

  confirmedAt: z.string().datetime(),

  /** Serverseitig beim Proposal ausgestelltes Token — verhindert, dass ein
   * Confirmation-Objekt für ein Proposal gebaut wird, das der Server nie
   * ausgestellt hat (z.B. manuell konstruierter Request). */
  confirmationToken: z.string().min(16),

  /** Muss mit der Version übereinstimmen, unter der der Server das
   * Proposal zuletzt kennt — siehe PROPOSAL_CHANGED oben. */
  proposalVersion: z.number().int().nonnegative(),
});
export type HufiObservationConfirmation = z.infer<
  typeof HufiObservationConfirmationSchema
>;
