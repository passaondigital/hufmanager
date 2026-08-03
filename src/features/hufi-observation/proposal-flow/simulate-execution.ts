// ── Simulierte Ausführung — GARANTIERT KEINE SCHREIBOPERATION ──────────
//
// Diese Datei darf NIE einen Supabase-Insert/Update/Delete enthalten und
// importiert absichtlich KEIN Supabase-Client-Modul. Sie baut nur ein
// Result-Contract-Objekt im Speicher, das anzeigt, WAS bei einer echten
// Ausführung (künftige Bauphase, siehe
// docs/hufi-observation-phase-1-contracts.md Abschnitt 17 — dedizierte
// RPC) passieren würde — ohne es tatsächlich zu tun. Die aufrufende UI
// MUSS den Hinweis "Noch nicht gespeichert" sichtbar anzeigen (siehe
// ObservationProposalLab.tsx).

import {
  HufiObservationResultSchema,
  type HufiObservationResult,
} from "../contracts/hufi-observation-result";
import type { HufiObservationConfirmation } from "../contracts/hufi-observation-confirmation";
import type { HufiObservationProposal } from "../contracts/hufi-observation-proposal";

export interface SimulateExecutionParams {
  proposal: HufiObservationProposal;
  confirmation: HufiObservationConfirmation;
  horseName: string;
}

export function simulateObservationExecution(
  params: SimulateExecutionParams,
): HufiObservationResult {
  const { confirmation, horseName } = params;

  if (confirmation.decision === "cancel") {
    throw new Error(
      "simulateObservationExecution darf nicht mit decision='cancel' aufgerufen werden",
    );
  }

  const result: HufiObservationResult = {
    actionId: crypto.randomUUID(),
    status: "completed",
    message: `SIMULATION: Beobachtung für ${horseName} würde jetzt gespeichert — es wurde NICHTS in die Datenbank geschrieben.`,
    warnings: [
      "Entwicklungs-Simulation — kein Insert in hoof_entries/hoof_analyses/hufi_followup_suggestions/hufi_task_queue.",
    ],
    completedAt: new Date().toISOString(),
    reversible: false,
  };

  return HufiObservationResultSchema.parse(result);
}
