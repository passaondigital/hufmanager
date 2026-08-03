// ── Heuristische (NICHT echte KI-) Extraktion ───────────────────────────
//
// WICHTIG: Dies ist bewusst KEINE echte KI-Extraktion — es wird keine
// Edge Function/kein Claude-Aufruf ausgelöst. Der Auftrag verlangt für
// diese Runde ausdrücklich "noch ohne echte Speicherung" und listet die
// Pferdesuche als das eigentliche Risiko (siehe
// docs/hufi-observation-phase-1-contracts.md Abschnitt 20 — "der
// aufwändigste, unsicherste Teil ist nicht die KI-Extraktion"). Diese
// Funktion bildet nur eine simple, transparente Heuristik nach, damit der
// Proposal-Flow durchspielbar ist, OHNE eine KI-Fähigkeit vorzutäuschen,
// die hier nicht eingebaut wurde. Klar als "Heuristik" benannt und in der
// UI so beschriftet — nicht mit der echten, produktiven
// hufi-ai-voice-finding-Pipeline verwechseln.

import type { ObservationDraft, ObservationUrgency, HoofPosition } from "../contracts/hufi-observation-structure";
import type { ObservationSource } from "../contracts/hufi-observation-input";

export interface HeuristicExtractionResult {
  draft: ObservationDraft;
  missingFields: string[];
  ambiguities: string[];
  /** Bewusst niedrig gehalten (max. 0.6) — eine Heuristik verdient nie
   * dieselbe Konfidenzspanne wie ein echter KI-Aufruf. */
  confidence: number;
}

const HOOF_POSITION_KEYWORDS: Array<[RegExp, HoofPosition]> = [
  [/vorne?\s*links|vorderhuf\s*links|\bvl\b/i, "vl"],
  [/vorne?\s*rechts|vorderhuf\s*rechts|\bvr\b/i, "vr"],
  [/hinten\s*links|hinterhuf\s*links|\bhl\b/i, "hl"],
  [/hinten\s*rechts|hinterhuf\s*rechts|\bhr\b/i, "hr"],
];

function detectHoofPosition(text: string): HoofPosition | undefined {
  for (const [pattern, position] of HOOF_POSITION_KEYWORDS) {
    if (pattern.test(text)) return position;
  }
  return undefined;
}

function detectUrgency(text: string): ObservationUrgency {
  if (/tierarzt/i.test(text)) return "vet_recommended";
  if (/osteo/i.test(text)) return "osteo_recommended";
  return "routine";
}

/** Sehr einfache Heuristik: Beobachtungstext wird 1:1 als `finding`
 * übernommen (keine Erfindung einer Maßnahme/Empfehlung, die nicht real
 * erkannt wurde) — `actionTaken`/`recommendation` bleiben bewusst
 * undefined, statt Text zu erraten, der nicht zuverlässig trennbar ist. */
export function extractObservationDraftHeuristically(
  rawInput: string,
  source: ObservationSource,
): HeuristicExtractionResult {
  const trimmed = rawInput.trim();
  const hoofPosition = detectHoofPosition(trimmed);
  const urgency = detectUrgency(trimmed);

  const missingFields: string[] = [];
  const ambiguities: string[] = [];

  if (!trimmed) {
    missingFields.push("finding");
  }
  if (!hoofPosition) {
    ambiguities.push(
      "Keine Hufposition (vorne links/rechts, hinten links/rechts) im Text erkannt.",
    );
  }

  const draft: ObservationDraft = {
    finding: trimmed || undefined,
    hoofPosition,
    urgency,
    observedAt: new Date().toISOString(),
    source,
  };

  return {
    draft,
    missingFields,
    ambiguities,
    confidence: trimmed ? (hoofPosition ? 0.6 : 0.4) : 0,
  };
}
