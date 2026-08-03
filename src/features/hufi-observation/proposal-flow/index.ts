// Textbasierter Observation-Proposal-Flow — isolierte Schicht unter
// src/features/hufi-observation/proposal-flow/. Verbindet die echte
// Pferdesuche (horse-resolution/) mit einer heuristischen (NICHT echten
// KI-)Extraktion zu einem Proposal, simuliert Bestätigung/Ausführung.
// KEINE echte Speicherung — siehe simulate-execution.ts.

export { buildObservationInput } from "./build-input";
export type { BuildInputParams } from "./build-input";

export { extractObservationDraftHeuristically } from "./extract-observation-draft";
export type { HeuristicExtractionResult } from "./extract-observation-draft";

export { createObservationProposal } from "./build-proposal";
export type { CreateProposalParams } from "./build-proposal";

export { buildConfirmation } from "./confirmation";
export type { BuildConfirmationParams } from "./confirmation";

export { simulateObservationExecution } from "./simulate-execution";
export type { SimulateExecutionParams } from "./simulate-execution";

export { ObservationProposalLab } from "./ObservationProposalLab";
