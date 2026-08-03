import { z } from "zod";

// ── Result Contract ──────────────────────────────────────────────────────
//
// Rückgabe nach der Ausführung — Grundlage für die "konkrete Bestätigung"
// aus dem Produktziel ("Hufi bestätigt konkret, was gespeichert wurde").
// Entspricht fachlich dem heutigen `ActionResult` aus
// src/lib/hufi-actions.ts (`{success, message, data}`), aber granularer
// (getrennte IDs statt einem generischen `data`-Feld) und mit explizitem
// `partially_completed`-Status für den Fall, dass genau der heute schon
// beobachtete Teilfehler (hoof_entries erfolgreich, hoof_analyses
// fehlgeschlagen) auftritt.

export const ExecutionStatusSchema = z.enum([
  "completed",
  "partially_completed",
  "failed",
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const HufiObservationResultSchema = z.object({
  actionId: z.string().uuid(),
  status: ExecutionStatusSchema,

  hoofEntryId: z.string().uuid().optional(),
  hoofAnalysisId: z.string().uuid().optional(),
  followUpId: z.string().uuid().optional(),
  /** Falls die Ausführung über hufi_task_queue orchestriert wurde. */
  taskId: z.string().uuid().optional(),

  /** Für die Nutzer-Bestätigung, z.B. "Befund für Ginger gespeichert,
   * Kontrolle in 4 Wochen vorgemerkt." */
  message: z.string(),
  warnings: z.array(z.string()),

  completedAt: z.string().datetime(),

  /** Ob diese Aktion rückgängig gemacht werden kann. Heute: nein — es
   * gibt kein Undo-Muster für hoof_entries/hoof_analyses (siehe
   * docs/hufi-observation-workflow-analysis.md Abschnitt 21, Punkt 9).
   * Feld bewusst vorbereitet, damit eine spätere Undo-Fähigkeit ohne
   * Contract-Bruch nachgerüstet werden kann. */
  reversible: z.boolean(),
  undoToken: z.string().optional(),
});
export type HufiObservationResult = z.infer<typeof HufiObservationResultSchema>;
