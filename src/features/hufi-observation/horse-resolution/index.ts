// Echte Pferdesuche und Disambiguierung — isolierte Schicht unter
// src/features/hufi-observation/horse-resolution/. Nutzt ausschließlich
// bestehende Datenmodelle (horses, access_grants, profiles) und bestehende
// RLS (siehe docs/hufi-id-system-analysis.md). Keine Schreiboperationen.

export { resolveHorse, resolveContextHorse, resolveFromMatches } from "./resolve";
export type { ResolveHorseInput, ResolveHorseOutput } from "./resolve";

export { fetchAccessibleHorses, checkSingleHorseAccess } from "./horse-access";
export type { AccessibleHorse } from "./horse-access";

export { matchHorsesByName } from "./match";
export type { HorseMatch, MatchTier } from "./match";

export { normalizeHorseSearchTerm, normalizeReadableIdInput } from "./normalize";
