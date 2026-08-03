// Typgeprüfte Beispiel-/Assertions-Skripte, kein echter Test-Runner
// (siehe ../../contracts/__examples__/README.md). Geprüft via
// `npx tsc --noEmit`. Deckt NUR die reinen, synchronen Bausteine ab
// (Heuristik, Confirmation-Bau, simulierte Ausführung) — die echte
// Pferdesuche (Supabase-Zugriff) ist in
// ../../horse-resolution/__examples__/ separat geprüft, ohne Netzwerk,
// über die reinen Entscheidungsfunktionen resolveFromMatches/
// resolveContextHorse.

import { extractObservationDraftHeuristically } from "../extract-observation-draft";
import { buildConfirmation } from "../confirmation";
import { simulateObservationExecution } from "../simulate-execution";
import type { HufiObservationProposal } from "../../contracts/hufi-observation-proposal";
import { assertTrue, assertFalse } from "../../contracts/__examples__/assert-helpers";

// ── Heuristische Extraktion ──────────────────────────────────────────────
{
  const r = extractObservationDraftHeuristically(
    "vorne links die äußere Wand ausgebrochen, Tierarzt empfohlen",
    "text",
  );
  assertTrue(r.draft.hoofPosition === "vl", "Hufposition 'vorne links' wird als 'vl' erkannt");
  assertTrue(r.draft.urgency === "vet_recommended", "'Tierarzt' im Text setzt urgency auf vet_recommended");
  assertTrue(r.draft.finding === r.draft.finding?.trim(), "finding ist bereits getrimmt");
  assertTrue(r.missingFields.length === 0, "bei vorhandenem Text ist 'finding' nicht in missingFields");
}

{
  const r = extractObservationDraftHeuristically("Kontrolle beim Osteopathen sinnvoll", "text");
  assertTrue(r.draft.urgency === "osteo_recommended", "'Osteopathen' setzt urgency auf osteo_recommended");
  assertTrue(
    r.ambiguities.length > 0,
    "fehlende Hufposition wird als Ambiguität vermerkt (Heuristik erkennt keine Position)",
  );
}

{
  const r = extractObservationDraftHeuristically("", "text");
  assertTrue(r.missingFields.includes("finding"), "leerer Text führt zu missingFields=['finding']");
  assertTrue(r.confidence === 0, "leerer Text hat Konfidenz 0");
}

{
  const r = extractObservationDraftHeuristically("Alles unauffällig", "voice");
  assertTrue(r.draft.urgency === "routine", "ohne Dringlichkeits-Schlüsselwort ist urgency 'routine'");
  assertTrue(
    r.confidence > 0 && r.confidence <= 0.6,
    "Heuristik-Konfidenz ist bewusst niedrig gehalten (max. 0.6, keine echte KI)",
  );
}

// ── Confirmation: confirm/edit/cancel ────────────────────────────────────
const baseProposal: HufiObservationProposal = {
  proposalId: "00000000-0000-0000-0000-000000000030",
  actionType: "create_observation",
  source: "text",
  rawTranscript: "Testbeobachtung",
  horseResolution: "exact",
  horseCandidates: [
    {
      horseId: "00000000-0000-0000-0000-000000000031",
      horseName: "Bella",
      confidence: 0.95,
      matchReason: "Exakter Namenstreffer",
      selectable: true,
    },
  ],
  selectedHorseId: "00000000-0000-0000-0000-000000000031",
  observation: { source: "text", finding: "Testbeobachtung" },
  missingFields: [],
  ambiguities: [],
  confidence: 0.6,
  warnings: [],
  confirmationRequired: true,
  expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  createdAt: new Date().toISOString(),
};

{
  const confirmation = buildConfirmation({
    proposal: baseProposal,
    decision: "confirm",
    selectedHorseId: baseProposal.selectedHorseId,
  });
  assertTrue(confirmation.decision === "confirm", "confirm-Entscheidung wird korrekt gebaut");
  assertTrue(
    confirmation.confirmationToken.length >= 16,
    "confirmationToken erfüllt die Mindestlänge des Contracts",
  );
}

{
  const confirmation = buildConfirmation({
    proposal: baseProposal,
    decision: "edit",
    selectedHorseId: baseProposal.selectedHorseId,
    editedFields: { finding: "Korrigierte Beobachtung" },
  });
  assertTrue(confirmation.decision === "edit", "edit-Entscheidung wird korrekt gebaut");
  assertTrue(
    confirmation.editedFields?.finding === "Korrigierte Beobachtung",
    "editedFields trägt nur die geänderten Felder, nicht das gesamte Original",
  );
}

{
  const confirmation = buildConfirmation({ proposal: baseProposal, decision: "cancel" });
  assertTrue(confirmation.decision === "cancel", "cancel-Entscheidung wird korrekt gebaut");
  assertTrue(
    confirmation.selectedHorseId === undefined,
    "cancel benötigt kein selectedHorseId (Vorgang wird nicht ausgeführt)",
  );
}

// ── Simulierte Bestätigung: KEINE Schreiboperation ──────────────────────
{
  const confirmation = buildConfirmation({
    proposal: baseProposal,
    decision: "confirm",
    selectedHorseId: baseProposal.selectedHorseId,
  });
  const result = simulateObservationExecution({
    proposal: baseProposal,
    confirmation,
    horseName: "Bella",
  });
  assertTrue(result.status === "completed", "simulierte Ausführung liefert status='completed'");
  assertTrue(
    result.message.startsWith("SIMULATION"),
    "Ergebnis-Nachricht kennzeichnet sich selbst eindeutig als Simulation",
  );
  assertTrue(
    result.warnings.some((w) => /kein insert/i.test(w)),
    "Warnungen weisen explizit auf die fehlende Schreiboperation hin",
  );
  assertTrue(result.reversible === false, "reversible ist wie bei jeder echten Beobachtung false");
}

{
  const cancelConfirmation = buildConfirmation({ proposal: baseProposal, decision: "cancel" });
  let threw = false;
  try {
    simulateObservationExecution({
      proposal: baseProposal,
      confirmation: cancelConfirmation,
      horseName: "Bella",
    });
  } catch {
    threw = true;
  }
  assertTrue(threw, "simulateObservationExecution verweigert die Ausführung bei decision='cancel'");
}

assertFalse(
  baseProposal.horseResolution === "ambiguous",
  "Fixture-Proposal ist bewusst 'exact', nicht 'ambiguous' (Mehrdeutigkeit wird in horse-resolution/__examples__ geprüft)",
);
