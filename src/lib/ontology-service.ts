import { supabase } from "@/integrations/supabase/client";

export interface OntologyEntry {
  id: string;
  term: string;
  aliases: string[];
  category: string;
  tags: string[];
  autoflow_field: string | null;
  autoflow_action: string | null;
  formal_term: string | null;
  description: string | null;
}

export interface RecognizedEntity {
  term: string;           // matched term (canonical form)
  matchedText: string;    // what was actually in the transcript
  entry: OntologyEntry;
  position: number;       // char offset in original text
}

export interface CorrectionSuggestion {
  original: string;       // word in transcript
  suggested: string;      // canonical term
  entry: OntologyEntry;
  similarity: number;     // 0-1
}

export interface AutoflowAction {
  field: string;
  action: string;
  term: string;
  tags: string[];
}

// Module-level cache
let _cache: OntologyEntry[] | null = null;

export async function loadOntology(): Promise<OntologyEntry[]> {
  if (_cache !== null) return _cache;

  try {
    const { data, error } = await supabase
      .from("equine_ontology")
      .select("*");

    if (error) {
      console.error("[OntologyService] Failed to load ontology:", error);
      return [];
    }

    _cache = (data ?? []) as OntologyEntry[];
    return _cache;
  } catch (err) {
    console.error("[OntologyService] Unexpected error loading ontology:", err);
    return [];
  }
}

export async function recognizeEntities(
  text: string,
  ontology?: OntologyEntry[]
): Promise<RecognizedEntity[]> {
  const entries = ontology ?? (await loadOntology());
  const lowerText = text.toLowerCase();
  const matches: RecognizedEntity[] = [];

  for (const entry of entries) {
    const candidates = [entry.term, ...entry.aliases];

    for (const candidate of candidates) {
      const lowerCandidate = candidate.toLowerCase();
      let searchFrom = 0;

      while (searchFrom < lowerText.length) {
        const pos = lowerText.indexOf(lowerCandidate, searchFrom);
        if (pos === -1) break;

        // Ensure we match on word boundaries (not mid-word)
        const before = pos === 0 ? "" : lowerText[pos - 1];
        const after = pos + lowerCandidate.length >= lowerText.length
          ? ""
          : lowerText[pos + lowerCandidate.length];

        const isBoundaryBefore = pos === 0 || /[\s.,;:!?()\-]/.test(before);
        const isBoundaryAfter =
          pos + lowerCandidate.length >= lowerText.length ||
          /[\s.,;:!?()\-]/.test(after);

        if (isBoundaryBefore && isBoundaryAfter) {
          matches.push({
            term: entry.term,
            matchedText: text.slice(pos, pos + candidate.length),
            entry,
            position: pos,
          });
        }

        searchFrom = pos + 1;
      }
    }
  }

  // Deduplication: for overlapping positions, keep the longest match
  matches.sort((a, b) => a.position - b.position || b.matchedText.length - a.matchedText.length);

  const deduplicated: RecognizedEntity[] = [];
  for (const match of matches) {
    const matchEnd = match.position + match.matchedText.length;
    const overlaps = deduplicated.some((existing) => {
      const existingEnd = existing.position + existing.matchedText.length;
      return match.position < existingEnd && matchEnd > existing.position;
    });
    if (!overlaps) {
      deduplicated.push(match);
    }
  }

  return deduplicated.sort((a, b) => a.position - b.position);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({length: m+1}, (_, i) => Array(n+1).fill(0).map((_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

export async function suggestCorrections(
  text: string,
  ontology?: OntologyEntry[]
): Promise<CorrectionSuggestion[]> {
  const entries = ontology ?? (await loadOntology());

  // Tokenize: split on whitespace and punctuation, keep tokens >= 5 chars
  const tokens = text.split(/[\s.,;:!?()\-]+/).filter((t) => t.length >= 5);

  const suggestions: CorrectionSuggestion[] = [];
  const seen = new Set<string>(); // deduplicate by original+suggested pair

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    for (const entry of entries) {
      const candidates = [entry.term, ...entry.aliases];

      for (const candidate of candidates) {
        const lowerCandidate = candidate.toLowerCase();
        const dist = levenshtein(lowerToken, lowerCandidate);

        if (dist <= 2) {
          const maxLen = Math.max(lowerToken.length, lowerCandidate.length);
          const similarity = maxLen === 0 ? 1 : 1 - dist / maxLen;

          if (similarity > 0.75) {
            const key = `${token}|${entry.term}`;
            if (!seen.has(key)) {
              seen.add(key);
              suggestions.push({
                original: token,
                suggested: candidate,
                entry,
                similarity,
              });
            }
          }
        }
      }
    }
  }

  // Sort by similarity descending, return top 5
  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

export function getAutoflowActions(entities: RecognizedEntity[]): AutoflowAction[] {
  const seenFields = new Set<string>();
  const actions: AutoflowAction[] = [];

  for (const entity of entities) {
    const { autoflow_field, autoflow_action } = entity.entry;
    if (!autoflow_field || !autoflow_action) continue;
    if (seenFields.has(autoflow_field)) continue;

    seenFields.add(autoflow_field);
    actions.push({
      field: autoflow_field,
      action: autoflow_action,
      term: entity.term,
      tags: entity.entry.tags ?? [],
    });
  }

  return actions;
}

export function buildB2BReportContext(entities: RecognizedEntity[]): string {
  if (entities.length === 0) return "";

  const lines = entities.map((entity) => {
    const formal = entity.entry.formal_term
      ? ` (formal: ${entity.entry.formal_term})`
      : "";
    const tags =
      entity.entry.tags && entity.entry.tags.length > 0
        ? ` [${entity.entry.tags.join(", ")}]`
        : "";
    return `- ${entity.term}${formal}${tags}`;
  });

  return `ERKANNTE FACHBEGRIFFE:\n${lines.join("\n")}\nBITTE VERWENDE DIE FORMALEN VETERINÄRTERMINOLOGIE in deiner Antwort.`;
}

export function formatSmartCorrections(
  suggestions: CorrectionSuggestion[]
): string | null {
  if (suggestions.length === 0) return null;

  const parts = suggestions.map(
    (s) => `**${s.suggested}** (statt '${s.original}')`
  );

  if (parts.length === 1) {
    return `Meintest du: ${parts[0]}?`;
  }

  const [first, ...rest] = parts;
  return `Meintest du: ${first}? Oder: ${rest.join("? Oder: ")}?`;
}
