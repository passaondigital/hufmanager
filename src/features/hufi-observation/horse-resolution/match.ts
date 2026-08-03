// ── Namens-/EQID-Matching gegen eine bereits zugriffsgeprüfte Pferdeliste ──
//
// Arbeitet ausschließlich auf AccessibleHorse[] (siehe horse-access.ts) —
// bekommt also strukturell nie ein fremdes Pferd zu Gesicht. Reines,
// zustandsloses Scoring, keine Datenbankzugriffe.

import type { AccessibleHorse } from "./horse-access";
import { normalizeHorseSearchTerm, normalizeReadableIdInput } from "./normalize";

export type MatchTier = "readable_id" | "exact_name" | "prefix_name" | "partial_name";

export interface HorseMatch {
  horse: AccessibleHorse;
  confidence: number;
  matchReason: string;
  tier: MatchTier;
}

const MIN_QUERY_LENGTH = 2;

const TIER_CONFIDENCE: Record<MatchTier, number> = {
  readable_id: 1,
  exact_name: 0.95,
  prefix_name: 0.7,
  partial_name: 0.5,
};

const TIER_REASON: Record<MatchTier, string> = {
  readable_id: "Eindeutiger EQID-Treffer",
  exact_name: "Exakter Namenstreffer",
  prefix_name: "Name beginnt mit Suchbegriff",
  partial_name: "Name enthält Suchbegriff",
};

/** Liefert für jedes Pferd höchstens einen Treffer (die beste Tier), nur
 * Pferde mit Treffer werden zurückgegeben. Eingabe leer/zu kurz → []. */
export function matchHorsesByName(
  horses: AccessibleHorse[],
  rawQuery: string,
): HorseMatch[] {
  const normalizedQuery = normalizeHorseSearchTerm(rawQuery);
  const readableIdQuery = normalizeReadableIdInput(rawQuery);

  if (normalizedQuery.length < MIN_QUERY_LENGTH) return [];

  const matches: HorseMatch[] = [];

  for (const horse of horses) {
    // EQID-Treffer hat Vorrang vor Namens-Matching, falls die Eingabe wie
    // eine readable_id aussieht (z.B. "EQID-483920" oder "#EQID-483920").
    if (horse.readableId && readableIdQuery === horse.readableId.toUpperCase()) {
      matches.push({
        horse,
        confidence: TIER_CONFIDENCE.readable_id,
        matchReason: TIER_REASON.readable_id,
        tier: "readable_id",
      });
      continue;
    }

    const normalizedName = normalizeHorseSearchTerm(horse.name);
    if (!normalizedName) continue;

    let tier: MatchTier | null = null;
    if (normalizedName === normalizedQuery) {
      tier = "exact_name";
    } else if (normalizedName.startsWith(normalizedQuery)) {
      tier = "prefix_name";
    } else if (normalizedName.includes(normalizedQuery)) {
      tier = "partial_name";
    }

    if (tier) {
      matches.push({
        horse,
        confidence: TIER_CONFIDENCE[tier],
        matchReason: TIER_REASON[tier],
        tier,
      });
    }
  }

  // Beste Treffer zuerst (höhere Konfidenz = engerer Match).
  return matches.sort((a, b) => b.confidence - a.confidence);
}
