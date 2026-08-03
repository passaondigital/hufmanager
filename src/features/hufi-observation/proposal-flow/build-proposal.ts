// ── Proposal-Erzeugung: echte Pferdesuche + heuristische Struktur ──────
//
// Verbindet die echte horse-resolution-Schicht mit der (bewusst
// heuristischen, siehe extract-observation-draft.ts) Beobachtungsstruktur
// zu einem vollständigen HufiObservationProposal, geprüft gegen den
// Phase-1-Contract (HufiObservationProposalSchema.parse).

import { resolveHorse } from "../horse-resolution";
import { extractObservationDraftHeuristically } from "./extract-observation-draft";
import {
  HufiObservationProposalSchema,
  type HufiObservationProposal,
} from "../contracts/hufi-observation-proposal";
import type { HufiObservationInput } from "../contracts/hufi-observation-input";

const PROPOSAL_TTL_MS = 5 * 60_000;

export interface CreateProposalParams {
  /** MUSS die Session-ID des aufrufenden Nutzers sein — niemals
   * input.userId (Client-Feld, siehe hufi-observation-input.ts). */
  authenticatedUserId: string;
  input: HufiObservationInput;
  /** Getrennt vom Beobachtungstext: expliziter Such-/Auswahlbegriff für
   * die Pferdesuche ("Pferdenamen-Erkennung ... Übergabe an die
   * Suchschicht", siehe Auftrag Phase 3) — vermeidet, eine
   * Named-Entity-Recognition vorzutäuschen, die hier nicht gebaut wurde. */
  horseQuery: string;
}

function buildWarnings(status: HufiObservationProposal["horseResolution"]): string[] {
  switch (status) {
    case "ambiguous":
      return ["Mehrere Pferde gefunden — bitte eines auswählen."];
    case "not_found":
      return ["Kein Pferd mit diesem Namen/dieser EQID gefunden."];
    case "archived":
      return ["Gefundenes Pferd ist nicht aktiv (verkauft/verstorben/archiviert/gestohlen)."];
    case "unauthorized":
      return ["Kein Zugriff auf das Pferd aus dem Seitenkontext."];
    default:
      return [];
  }
}

export async function createObservationProposal(
  params: CreateProposalParams,
): Promise<HufiObservationProposal> {
  const { authenticatedUserId, input, horseQuery } = params;

  const resolution = await resolveHorse({
    authenticatedUserId,
    query: horseQuery,
    currentHorseId: input.currentHorseId,
  });

  const extraction = extractObservationDraftHeuristically(input.rawInput, input.source);

  const missingFields = [...extraction.missingFields];
  if (resolution.status !== "exact" && resolution.status !== "contextual") {
    missingFields.push("selectedHorseId");
  }

  const proposal: HufiObservationProposal = {
    proposalId: crypto.randomUUID(),
    actionType: "create_observation",
    source: input.source,
    rawTranscript: input.rawInput,
    horseResolution: resolution.status,
    horseCandidates: resolution.candidates,
    selectedHorseId: resolution.selectedHorseId,
    appointmentId: input.currentAppointmentId,
    observation: extraction.draft,
    missingFields,
    ambiguities: extraction.ambiguities,
    confidence: extraction.confidence,
    warnings: buildWarnings(resolution.status),
    confirmationRequired: true,
    expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  };

  return HufiObservationProposalSchema.parse(proposal);
}
