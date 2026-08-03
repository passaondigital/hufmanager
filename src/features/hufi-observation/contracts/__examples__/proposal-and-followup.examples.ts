import {
  HorseResolutionStatusSchema,
  HufiObservationProposalSchema,
} from "../hufi-observation-proposal";
import { HufiFollowUpProposalSchema } from "../hufi-observation-followup";
import { assertFalse, assertTrue } from "./assert-helpers";

// ── Alle sechs Horse-Resolution-Zustände ────────────────────────────────
const resolutionStates = [
  "exact",
  "contextual",
  "ambiguous",
  "not_found",
  "unauthorized",
  "archived",
] as const;
for (const state of resolutionStates) {
  assertTrue(
    HorseResolutionStatusSchema.safeParse(state).success,
    `Horse-Resolution-Zustand "${state}" ist ein gültiger Wert`,
  );
}
assertFalse(
  HorseResolutionStatusSchema.safeParse("guessed").success,
  "unbekannter Horse-Resolution-Zustand wird abgelehnt",
);

const baseProposal = {
  proposalId: "00000000-0000-0000-0000-000000000010",
  actionType: "create_observation" as const,
  source: "voice" as const,
  rawTranscript: "bei hope war heute vorne links die äußere wand ausgebrochen",
  horseCandidates: [],
  observation: { source: "voice" as const },
  missingFields: [],
  ambiguities: [],
  confidence: 0.7,
  warnings: [],
  confirmationRequired: true as const,
  expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  createdAt: new Date().toISOString(),
};

// exact-Zuordnung — genau ein Kandidat, auswählbar
assertTrue(
  HufiObservationProposalSchema.safeParse({
    ...baseProposal,
    horseResolution: "exact",
    selectedHorseId: "00000000-0000-0000-0000-000000000020",
    horseCandidates: [
      {
        horseId: "00000000-0000-0000-0000-000000000020",
        horseName: "Hope",
        confidence: 0.95,
        matchReason: "Eindeutiger Namenstreffer",
        selectable: true,
      },
    ],
  }).success,
  "exact horse match wird akzeptiert",
);

// ambiguous — mehrere Kandidaten, keiner vorausgewählt
assertTrue(
  HufiObservationProposalSchema.safeParse({
    ...baseProposal,
    horseResolution: "ambiguous",
    horseCandidates: [
      {
        horseId: "00000000-0000-0000-0000-000000000021",
        horseName: "Ginger",
        confidence: 0.5,
        matchReason: "Namensgleichheit (1 von 2)",
        selectable: true,
      },
      {
        horseId: "00000000-0000-0000-0000-000000000022",
        horseName: "Ginger",
        confidence: 0.5,
        matchReason: "Namensgleichheit (2 von 2)",
        selectable: true,
      },
    ],
  }).success,
  "ambiguous horse match wird akzeptiert",
);

// not_found
assertTrue(
  HufiObservationProposalSchema.safeParse({
    ...baseProposal,
    horseResolution: "not_found",
    horseCandidates: [],
    missingFields: ["selectedHorseId"],
  }).success,
  "not_found wird akzeptiert",
);

// unauthorized — Kandidat gefunden, aber nicht auswählbar
assertTrue(
  HufiObservationProposalSchema.safeParse({
    ...baseProposal,
    horseResolution: "unauthorized",
    horseCandidates: [
      {
        horseId: "00000000-0000-0000-0000-000000000023",
        horseName: "Fremdes Pferd",
        confidence: 0.9,
        matchReason: "Namenstreffer, aber kein Zugriff",
        selectable: false,
        exclusionReason: "Kein access_grants-Eintrag für diesen Provider",
      },
    ],
  }).success,
  "unauthorized wird akzeptiert",
);

// ── Follow-up: Regel "genau eines von intervalDays/dueDate" ────────────
assertTrue(
  HufiFollowUpProposalSchema.safeParse({
    enabled: true,
    intervalDays: 28,
    reason: "Kontrolle nach Nachraspeln, wie empfohlen",
    priority: "normal",
    status: "suggested",
  }).success,
  "Follow-up mit intervalDays wird akzeptiert",
);

assertTrue(
  HufiFollowUpProposalSchema.safeParse({
    enabled: true,
    dueDate: new Date(Date.now() + 28 * 86_400_000).toISOString(),
    reason: "Kontrolle nach Nachraspeln, wie empfohlen",
    priority: "normal",
    status: "suggested",
  }).success,
  "Follow-up mit dueDate wird akzeptiert",
);

assertFalse(
  HufiFollowUpProposalSchema.safeParse({
    enabled: true,
    intervalDays: 28,
    dueDate: new Date(Date.now() + 28 * 86_400_000).toISOString(),
    reason: "beides gesetzt",
    priority: "normal",
    status: "suggested",
  }).success,
  "Follow-up mit BEIDEN Zeitwerten wird abgelehnt",
);

assertFalse(
  HufiFollowUpProposalSchema.safeParse({
    enabled: true,
    reason: "keins gesetzt",
    priority: "normal",
    status: "suggested",
  }).success,
  "Follow-up mit KEINEM Zeitwert wird abgelehnt",
);

// enabled=false: Zeitwerte sind egal, kein Fehler
assertTrue(
  HufiFollowUpProposalSchema.safeParse({
    enabled: false,
    reason: "keine Folgekontrolle nötig",
    priority: "normal",
    status: "dismissed",
  }).success,
  "deaktiviertes Follow-up ohne Zeitwert wird akzeptiert",
);
