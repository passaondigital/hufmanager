import { z } from "zod";
import { ObservationSourceSchema } from "./hufi-observation-input";
import { NormalizedObservationSchema } from "./hufi-observation-structure";
import { HufiFollowUpProposalSchema } from "./hufi-observation-followup";

// ── Execution Contract ───────────────────────────────────────────────────
//
// Nur serverseitig vertrauenswürdige Daten — das ist die zentrale Regel
// dieses Contracts. Er wird NICHT aus dem Client-Request durchgereicht,
// sondern serverseitig aus Proposal + Confirmation + der authentifizierten
// Session neu zusammengesetzt.
//
// ── Felder, die der SERVER neu auflösen MUSS (niemals aus dem Client-
//    Payload übernehmen):
//   - authenticatedUserId  → aus der Supabase-Session/dem JWT
//     (auth.uid()), NICHT aus HufiObservationInput.userId
//   - resolvedProviderId   → serverseitig aus dem authentifizierten Nutzer
//     abgeleitet (Rolle "provider" geprüft), NICHT aus
//     HufiObservationInput.providerId
//   - horseId              → erneut gegen is_provider_for_horse()-Logik
//     geprüft (supabase/migrations/20260306042520_...sql), NICHT einfach
//     aus HufiObservationConfirmation.selectedHorseId übernommen — der
//     Zugriff könnte sich zwischen Proposal und Confirmation geändert
//     haben (Pferd verkauft/Zugriff entzogen)
//
// ── Felder, die aus dem Client-Payload NIE direkt übernommen werden
//    dürfen, auch wenn sie "plausibel" aussehen:
//   - HufiObservationInput.userId / .providerId (s.o.)
//   - HufiObservationConfirmation.selectedHorseId ohne erneute Prüfung
//   - HufiObservationProposal.confidence / .observation (KI-Ausgabe wird
//     nie direkt persistiert — nur die vom Nutzer bestätigte/editierte
//     Fassung, also normalizedObservation, das aus Proposal+Confirmation
//     serverseitig zusammengeführt wird)

export const HufiObservationAuditMetadataSchema = z.object({
  /** Bewusst NICHT hufi_context_log (siehe
   * docs/hufi-observation-phase-1-contracts.md Abschnitt 2) — neues,
   * migrationsgestütztes Audit-Feld für diese Aktion. */
  requestId: z.string().uuid(),
  proposalId: z.string().uuid(),
  confirmationId: z.string().uuid(),
  /** EU-AI-Act-Begründungspflicht, wie im bestehenden
   * hufi-actions.ts-Muster (`explanation`-Feld). */
  explanation: z.string(),
});
export type HufiObservationAuditMetadata = z.infer<
  typeof HufiObservationAuditMetadataSchema
>;

export const HufiObservationExecutionSchema = z.object({
  actionId: z.string().uuid(),
  proposalId: z.string().uuid(),
  confirmationId: z.string().uuid(),
  idempotencyKey: z.string().min(16),

  /** Server-resolved, siehe Kommentar oben. */
  authenticatedUserId: z.string().uuid(),
  /** Server-resolved, siehe Kommentar oben. */
  resolvedProviderId: z.string().uuid(),
  /** Server-revalidiert, siehe Kommentar oben. */
  horseId: z.string().uuid(),

  appointmentId: z.string().uuid().optional(),

  normalizedObservation: NormalizedObservationSchema,
  normalizedActionTaken: z.string().optional(),
  normalizedFollowUp: HufiFollowUpProposalSchema.optional(),

  source: ObservationSourceSchema,
  auditMetadata: HufiObservationAuditMetadataSchema,
  proposalVersion: z.number().int().nonnegative(),
});
export type HufiObservationExecution = z.infer<
  typeof HufiObservationExecutionSchema
>;
