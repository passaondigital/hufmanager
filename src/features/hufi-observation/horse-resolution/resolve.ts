// ── Pferd-Resolution: kombiniert Kontext + Namenssuche zu den sechs
// Horse-Resolution-Zuständen aus den Phase-1-Contracts ────────────────
//
// Reihenfolge (wie im bestehenden HufiAIVoiceRecorder-Verhalten und im
// Proposal-Contract-Kommentar vorgegeben, siehe
// hufi-observation-proposal.ts): ein gesetzter currentHorseId aus dem
// Seitenkontext hat IMMER Vorrang vor einer Namenssuche im Text
// ("contextual" statt "exact") — entspricht dem heutigen Verhalten, bei
// dem die Pferdeakte-Seite ihr eigenes Pferd nie zur Diskussion stellt.

import {
  checkSingleHorseAccess,
  fetchAccessibleHorses,
  type AccessibleHorse,
} from "./horse-access";
import { matchHorsesByName, type HorseMatch } from "./match";
import {
  HorseCandidateSchema,
  type HorseCandidate,
  type HorseResolutionStatus,
} from "../contracts/hufi-observation-proposal";

export interface ResolveHorseInput {
  /** MUSS die Session-ID des aufrufenden Nutzers sein (auth.uid()) — siehe
   * Sicherheitsregel in horse-access.ts, niemals eine andere/vom Client
   * sonst mitgelieferte ID. */
  authenticatedUserId: string;
  /** Roher Suchbegriff — Pferdename oder EQID, vom Nutzer eingegeben oder
   * heuristisch aus dem Beobachtungstext vorgeschlagen (siehe
   * proposal-flow/extract-horse-query.ts). */
  query: string;
  /** Falls aus einer offenen Pferdeakte-Seite bekannt — siehe
   * hufi-observation-input.ts: currentHorseId. */
  currentHorseId?: string;
}

export interface ResolveHorseOutput {
  status: HorseResolutionStatus;
  candidates: HorseCandidate[];
  selectedHorseId?: string;
}

const HORSE_STATUS_LABELS: Record<string, string> = {
  sold: "verkauft",
  deceased: "verstorben",
  archived: "archiviert",
  stolen: "gestohlen",
};

function archivedReason(horseStatus: string): string {
  return HORSE_STATUS_LABELS[horseStatus] ?? `nicht mehr aktiv (Status: ${horseStatus})`;
}

function toCandidate(
  horse: AccessibleHorse,
  opts: {
    confidence: number;
    matchReason: string;
    selectable: boolean;
    exclusionReason?: string;
  },
): HorseCandidate {
  const candidate: HorseCandidate = {
    horseId: horse.id,
    horseName: horse.name,
    owner: horse.ownerDisplayName ? { displayName: horse.ownerDisplayName } : undefined,
    confidence: opts.confidence,
    matchReason: opts.matchReason,
    selectable: opts.selectable,
    exclusionReason: opts.exclusionReason,
  };
  // Defensive Laufzeitprüfung gegen den Phase-1-Contract — wirft bei
  // einem Programmierfehler hier, statt fehlerhafte Daten weiterzureichen.
  return HorseCandidateSchema.parse(candidate);
}

/** Reine Entscheidungsfunktion (kein I/O) — nimmt ein bereits
 * zugriffsgeprüftes Pferd (oder null bei fehlendem Zugriff) entgegen und
 * bildet daraus den Resolution-Zustand. Getrennt von
 * `resolveFromContext` (I/O), damit diese Logik ohne Netzwerk-/
 * Supabase-Zugriff in __examples__ geprüft werden kann. */
export function resolveContextHorse(horse: AccessibleHorse | null): ResolveHorseOutput {
  if (!horse) {
    // Kein Zugriff — UND kein Hinweis, ob das Pferd überhaupt existiert.
    // Bewusst leere Kandidatenliste: die Aufgabenstellung verlangt, dass
    // der Zustand "unauthorized" im normalen Client-Suchergebnis keinerlei
    // Informationen über fremde Pferde enthält (kein Name, kein Besitzer).
    return { status: "unauthorized", candidates: [] };
  }

  if (horse.horseStatus !== "active") {
    return {
      status: "archived",
      candidates: [
        toCandidate(horse, {
          confidence: 1,
          matchReason: "Aus Seitenkontext übernommen",
          selectable: false,
          exclusionReason: archivedReason(horse.horseStatus),
        }),
      ],
    };
  }

  return {
    status: "contextual",
    candidates: [
      toCandidate(horse, {
        confidence: 1,
        matchReason: "Aus Seitenkontext übernommen",
        selectable: true,
      }),
    ],
    selectedHorseId: horse.id,
  };
}

async function resolveFromContext(
  authenticatedUserId: string,
  currentHorseId: string,
): Promise<ResolveHorseOutput> {
  const horse = await checkSingleHorseAccess(authenticatedUserId, currentHorseId);
  return resolveContextHorse(horse);
}

/** Reine Entscheidungsfunktion (kein I/O) — exportiert, damit
 * __examples__ die Zustände "exact"/"ambiguous"/"not_found"/"archived"
 * sowie "gleiche Namen, unterschiedliche Besitzer" ohne
 * Supabase-Zugriff gegen handgebaute HorseMatch[]-Fixtures prüfen kann. */
export function resolveFromMatches(matches: HorseMatch[]): ResolveHorseOutput {
  if (matches.length === 0) {
    return { status: "not_found", candidates: [] };
  }

  const activeMatches = matches.filter((m) => m.horse.horseStatus === "active");
  const archivedMatches = matches.filter((m) => m.horse.horseStatus !== "active");

  const candidates: HorseCandidate[] = [
    ...activeMatches.map((m) =>
      toCandidate(m.horse, {
        confidence: m.confidence,
        matchReason: m.matchReason,
        selectable: true,
      }),
    ),
    ...archivedMatches.map((m) =>
      toCandidate(m.horse, {
        confidence: m.confidence,
        matchReason: m.matchReason,
        selectable: false,
        exclusionReason: archivedReason(m.horse.horseStatus),
      }),
    ),
  ];

  if (activeMatches.length === 1) {
    return { status: "exact", candidates, selectedHorseId: activeMatches[0].horse.id };
  }
  if (activeMatches.length > 1) {
    return { status: "ambiguous", candidates };
  }
  // Keine aktiven Treffer, aber mindestens ein archivierter/verkaufter/
  // verstorbener/gestohlener Treffer.
  return { status: "archived", candidates };
}

/** Haupteinstiegspunkt der Pferdesuche. Liefert IMMER nur Pferde, auf die
 * `authenticatedUserId` laut RLS/access_grants tatsächlich Zugriff hat
 * (siehe horse-access.ts) — kann strukturell kein fremdes Pferd
 * zurückgeben, unabhängig vom Suchbegriff. */
export async function resolveHorse(input: ResolveHorseInput): Promise<ResolveHorseOutput> {
  const { authenticatedUserId, query, currentHorseId } = input;

  if (currentHorseId) {
    return resolveFromContext(authenticatedUserId, currentHorseId);
  }

  const accessible = await fetchAccessibleHorses(authenticatedUserId);
  const matches = matchHorsesByName(accessible, query);
  return resolveFromMatches(matches);
}
