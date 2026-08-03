import {
  NormalizedObservationSchema,
  ObservationDraftSchema,
} from "../hufi-observation-structure";
import {
  HUFI_OBSERVATION_ERROR_DEFAULTS,
  HufiObservationErrorSchema,
} from "../hufi-observation-error";
import { HUFI_OBSERVATION_POLICIES } from "../hufi-observation-policy";
import { assertFalse, assertTrue } from "./assert-helpers";

// ── Beobachtungsstruktur ─────────────────────────────────────────────────

// Draft: fehlende Beobachtung (kein "finding") ist im Draft-Stadium erlaubt
// — das Modell darf "null" liefern, missingFields zeigt das im Proposal an.
assertTrue(
  ObservationDraftSchema.safeParse({ source: "voice" }).success,
  "Draft ohne finding wird akzeptiert (KI konnte nichts extrahieren)",
);

// Normalisiert (nach Bestätigung): fehlende Beobachtung wird abgelehnt.
assertFalse(
  NormalizedObservationSchema.safeParse({
    source: "voice",
    observedAt: new Date().toISOString(),
  }).success,
  "normalisierte Beobachtung OHNE finding wird abgelehnt (VALIDATION_FAILED)",
);

// hoofMeasurements ohne hoofPosition wird abgelehnt
assertFalse(
  NormalizedObservationSchema.safeParse({
    finding: "Wand ausgebrochen",
    source: "voice",
    observedAt: new Date().toISOString(),
    hoofMeasurements: { toeLengthMm: 85 },
  }).success,
  "hoofMeasurements ohne hoofPosition wird abgelehnt",
);

// hoofMeasurements MIT hoofPosition wird akzeptiert
assertTrue(
  NormalizedObservationSchema.safeParse({
    finding: "Wand ausgebrochen",
    source: "voice",
    observedAt: new Date().toISOString(),
    hoofPosition: "vl",
    hoofMeasurements: { toeLengthMm: 85 },
  }).success,
  "hoofMeasurements MIT hoofPosition wird akzeptiert",
);

// ── Strukturierte Fehlerantwort ──────────────────────────────────────────
assertTrue(
  HufiObservationErrorSchema.safeParse({
    code: "HORSE_AMBIGUOUS",
    userMessage: "Es gibt mehrere Pferde mit diesem Namen — bitte auswählen.",
    ...HUFI_OBSERVATION_ERROR_DEFAULTS.HORSE_AMBIGUOUS,
  }).success,
  "strukturierte Fehlerantwort (HORSE_AMBIGUOUS) wird akzeptiert",
);

assertFalse(
  HufiObservationErrorSchema.safeParse({
    code: "SOME_MADE_UP_CODE",
    userMessage: "x",
    retryable: false,
    recoverable: false,
    requiresUserAction: false,
  }).success,
  "unbekannter Fehlercode wird abgelehnt",
);

// userMessage darf keine internen Details enthalten — das ist eine
// Konvention, keine Zod-Regel (Zod kann Textinhalt nicht fachlich
// bewerten). Hier als dokumentierter Beispiel-Check, wie ein Reviewer/
// Linter das später prüfen könnte:
function looksLikeInternalDetail(message: string): boolean {
  return /postgres|stack trace|supabase\.co|service_role/i.test(message);
}
assertFalse(
  looksLikeInternalDetail("Es gibt mehrere Pferde mit diesem Namen — bitte auswählen."),
  "userMessage-Beispiel enthält keine internen Details",
);
assertTrue(
  looksLikeInternalDetail("duplicate key value violates unique constraint on postgres table"),
  "Beispiel für eine ungeeignete (interne) userMessage wird als solche erkannt",
);

// ── Policy-Matrix ─────────────────────────────────────────────────────────

// save_observation verlangt zwingend eine Bestätigung
assertTrue(
  HUFI_OBSERVATION_POLICIES.save_observation.requiresConfirmation === true,
  "Policy save_observation verlangt requiresConfirmation=true",
);

// Der reine Vorschlag (Proposal) verlangt noch KEINE Bestätigung — er
// speichert ja noch nichts, siehe riskLevel "low" und
// requiresConfirmation=false.
assertTrue(
  HUFI_OBSERVATION_POLICIES.create_observation_proposal.requiresConfirmation === false &&
    HUFI_OBSERVATION_POLICIES.create_observation_proposal.riskLevel === "low",
  "Policy create_observation_proposal verlangt noch keine Bestätigung (reiner Vorschlag, keine Speicherung)",
);

// Jede Policy mit riskLevel="high" muss auditierbar UND
// bestätigungspflichtig sein — eine strukturelle Konsistenzregel über die
// gesamte Matrix.
for (const policy of Object.values(HUFI_OBSERVATION_POLICIES)) {
  if (policy.riskLevel === "high") {
    assertTrue(
      policy.auditable && policy.requiresConfirmation,
      `Hochrisiko-Policy "${policy.action}" ist auditierbar und bestätigungspflichtig`,
    );
  }
}
