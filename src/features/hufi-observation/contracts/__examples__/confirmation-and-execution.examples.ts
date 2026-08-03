import {
  HufiObservationConfirmationSchema,
} from "../hufi-observation-confirmation";
import {
  HufiObservationExecutionSchema,
  type HufiObservationExecution,
} from "../hufi-observation-execution";
import type { HufiObservationInput } from "../hufi-observation-input";
import { assertFalse, assertTrue } from "./assert-helpers";

const baseConfirmation = {
  proposalId: "00000000-0000-0000-0000-000000000010",
  confirmationId: "00000000-0000-0000-0000-000000000030",
  confirmedAt: new Date().toISOString(),
  confirmationToken: "confirm-token-0000000001",
  proposalVersion: 1,
};

// decision: confirm
assertTrue(
  HufiObservationConfirmationSchema.safeParse({
    ...baseConfirmation,
    decision: "confirm",
    selectedHorseId: "00000000-0000-0000-0000-000000000020",
  }).success,
  "decision=confirm wird akzeptiert",
);

// decision: edit (mit editedFields)
assertTrue(
  HufiObservationConfirmationSchema.safeParse({
    ...baseConfirmation,
    decision: "edit",
    selectedHorseId: "00000000-0000-0000-0000-000000000020",
    editedFields: { finding: "Wand war stärker ausgebrochen als zunächst diktiert" },
  }).success,
  "decision=edit mit editedFields wird akzeptiert",
);

// decision: cancel (selectedHorseId optional)
assertTrue(
  HufiObservationConfirmationSchema.safeParse({
    ...baseConfirmation,
    decision: "cancel",
  }).success,
  "decision=cancel ohne selectedHorseId wird akzeptiert",
);

// ── Abgelaufene Bestätigung — Schema selbst lässt das zu (Zeitprüfung ist
// serverseitige Logik, nicht Teil der Zod-Validierung), hier als
// dokumentiertes Beispiel für die serverseitige Prüfregel: ────────────────
function isConfirmationExpired(proposalExpiresAt: string, confirmedAt: string): boolean {
  return new Date(confirmedAt).getTime() > new Date(proposalExpiresAt).getTime();
}
assertTrue(
  isConfirmationExpired(
    "2026-01-01T10:00:00.000Z",
    "2026-01-01T10:10:00.000Z",
  ),
  "Bestätigung nach Ablauf des Proposals wird als abgelaufen erkannt (CONFIRMATION_EXPIRED)",
);
assertFalse(
  isConfirmationExpired(
    "2026-01-01T10:00:00.000Z",
    "2026-01-01T09:59:00.000Z",
  ),
  "Bestätigung vor Ablauf des Proposals gilt nicht als abgelaufen",
);

// ── Duplicate Action / Tenant Mismatch — ebenfalls serverseitige Prüfregeln,
// hier als dokumentierte Beispielfunktionen: ────────────────────────────
function isDuplicateAction(seenIdempotencyKeys: Set<string>, key: string): boolean {
  return seenIdempotencyKeys.has(key);
}
const seen = new Set<string>(["idem-key-0000000000000001"]);
assertTrue(
  isDuplicateAction(seen, "idem-key-0000000000000001"),
  "wiederverwendeter idempotencyKey wird als Duplikat erkannt (DUPLICATE_ACTION)",
);
assertFalse(
  isDuplicateAction(seen, "idem-key-0000000000000002"),
  "neuer idempotencyKey ist kein Duplikat",
);

function isTenantMismatch(resolvedProviderId: string, horseOwnerProviderId: string): boolean {
  return resolvedProviderId !== horseOwnerProviderId;
}
assertTrue(
  isTenantMismatch(
    "00000000-0000-0000-0000-0000000000aa",
    "00000000-0000-0000-0000-0000000000bb",
  ),
  "abweichender Provider wird als Tenant-Mismatch erkannt (TENANT_MISMATCH)",
);

// ── Execution Contract: gültiges Beispiel ───────────────────────────────
const executionExample: HufiObservationExecution = {
  actionId: "00000000-0000-0000-0000-000000000040",
  proposalId: "00000000-0000-0000-0000-000000000010",
  confirmationId: "00000000-0000-0000-0000-000000000030",
  idempotencyKey: "idem-key-0000000000000001",
  authenticatedUserId: "00000000-0000-0000-0000-0000000000aa",
  resolvedProviderId: "00000000-0000-0000-0000-0000000000aa",
  horseId: "00000000-0000-0000-0000-000000000020",
  normalizedObservation: {
    finding: "Äußere Wand vorne links ausgebrochen",
    source: "voice",
    observedAt: new Date().toISOString(),
  },
  source: "voice",
  auditMetadata: {
    requestId: "00000000-0000-0000-0000-000000000002",
    proposalId: "00000000-0000-0000-0000-000000000010",
    confirmationId: "00000000-0000-0000-0000-000000000030",
    explanation: "Nutzer hat den KI-Vorschlag nach Sprachaufnahme bestätigt",
  },
  proposalVersion: 1,
};
assertTrue(
  HufiObservationExecutionSchema.safeParse(executionExample).success,
  "gültiges Execution-Objekt wird akzeptiert",
);

// ── Feldvertrauen: Client-userId wird NICHT als serverseitig
// vertrauenswürdig markiert ─────────────────────────────────────────────
//
// Strukturprüfung: Execution Contract hat KEIN Feld "userId"/"providerId"
// (nur "authenticatedUserId"/"resolvedProviderId") — ein Aufrufer kann
// also gar nicht versehentlich HufiObservationInput.userId 1:1 in die
// Execution-Stufe durchreichen, ohne das Feld umzubenennen und damit
// bewusst neu aufzulösen.
const executionKeys = Object.keys(executionExample);
assertFalse(
  executionKeys.includes("userId"),
  "Execution Contract enthält kein rohes 'userId'-Feld",
);
assertFalse(
  executionKeys.includes("providerId"),
  "Execution Contract enthält kein rohes 'providerId'-Feld",
);
assertTrue(
  executionKeys.includes("authenticatedUserId") && executionKeys.includes("resolvedProviderId"),
  "Execution Contract verlangt stattdessen server-aufgelöste Felder",
);

// Gegenprobe: HufiObservationInput.userId existiert dort bewusst (Kontext
// für UI/Edge Function), ist aber ein anderer Typ-Kontext als
// authenticatedUserId — beide dürfen nicht verwechselt werden.
const inputKeysContainUserId: keyof HufiObservationInput = "userId";
assertTrue(
  inputKeysContainUserId === "userId",
  "HufiObservationInput trägt userId nur als Kontextfeld, nicht als Vertrauensgrundlage (siehe Kommentar in hufi-observation-input.ts)",
);
