import { z } from "zod";

// ── Error Contract ───────────────────────────────────────────────────────
//
// Strukturierte Fehlercodes für den gesamten Observation-Flow. `userMessage`
// darf NIE interne Details enthalten (keine SQL-Fehlermeldungen, keine
// Stacktraces, keine internen IDs) — dafür existiert `technicalMessage`
// separat, das nur geloggt, nie direkt angezeigt wird.

export const HufiObservationErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "HORSE_NOT_FOUND",
  "HORSE_AMBIGUOUS",
  "HORSE_UNAUTHORIZED",
  "HORSE_ARCHIVED",
  "APPOINTMENT_NOT_FOUND",
  "APPOINTMENT_CONFLICT",
  "CONFIRMATION_REQUIRED",
  "CONFIRMATION_EXPIRED",
  "PROPOSAL_CHANGED",
  "DUPLICATE_ACTION",
  "PERMISSION_DENIED",
  "TENANT_MISMATCH",
  "VALIDATION_FAILED",
  "STORAGE_FAILED",
  "FOLLOW_UP_FAILED",
  "PARTIAL_WRITE",
  "NETWORK_ERROR",
  "INTERNAL_ERROR",
]);
export type HufiObservationErrorCode = z.infer<
  typeof HufiObservationErrorCodeSchema
>;

export const HufiObservationErrorSchema = z.object({
  code: HufiObservationErrorCodeSchema,
  userMessage: z.string(),
  /** Nur für Logs/Support — nie in der UI anzeigen. */
  technicalMessage: z.string().optional(),
  retryable: z.boolean(),
  recoverable: z.boolean(),
  requiresUserAction: z.boolean(),
  field: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type HufiObservationError = z.infer<typeof HufiObservationErrorSchema>;

interface ErrorDefaults {
  retryable: boolean;
  recoverable: boolean;
  requiresUserAction: boolean;
}

// Default-Verhalten je Fehlercode — reduziert Wiederholung an den
// Aufrufstellen (die konkrete userMessage/technicalMessage/details bleiben
// dort situationsabhängig). Reine Konfiguration, keine Ausführungslogik.
export const HUFI_OBSERVATION_ERROR_DEFAULTS: Record<
  HufiObservationErrorCode,
  ErrorDefaults
> = {
  INVALID_INPUT: { retryable: false, recoverable: true, requiresUserAction: true },
  HORSE_NOT_FOUND: { retryable: false, recoverable: true, requiresUserAction: true },
  HORSE_AMBIGUOUS: { retryable: false, recoverable: true, requiresUserAction: true },
  HORSE_UNAUTHORIZED: { retryable: false, recoverable: false, requiresUserAction: false },
  HORSE_ARCHIVED: { retryable: false, recoverable: true, requiresUserAction: true },
  APPOINTMENT_NOT_FOUND: { retryable: false, recoverable: true, requiresUserAction: true },
  APPOINTMENT_CONFLICT: { retryable: false, recoverable: true, requiresUserAction: true },
  CONFIRMATION_REQUIRED: { retryable: false, recoverable: true, requiresUserAction: true },
  CONFIRMATION_EXPIRED: { retryable: false, recoverable: true, requiresUserAction: true },
  PROPOSAL_CHANGED: { retryable: false, recoverable: true, requiresUserAction: true },
  DUPLICATE_ACTION: { retryable: false, recoverable: true, requiresUserAction: false },
  PERMISSION_DENIED: { retryable: false, recoverable: false, requiresUserAction: false },
  TENANT_MISMATCH: { retryable: false, recoverable: false, requiresUserAction: false },
  VALIDATION_FAILED: { retryable: false, recoverable: true, requiresUserAction: true },
  STORAGE_FAILED: { retryable: true, recoverable: true, requiresUserAction: false },
  FOLLOW_UP_FAILED: { retryable: true, recoverable: true, requiresUserAction: false },
  PARTIAL_WRITE: { retryable: false, recoverable: true, requiresUserAction: true },
  NETWORK_ERROR: { retryable: true, recoverable: true, requiresUserAction: false },
  INTERNAL_ERROR: { retryable: true, recoverable: false, requiresUserAction: false },
};
