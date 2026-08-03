import { z } from "zod";
import { ObservationSourceSchema } from "./hufi-observation-input";
import { ObservationDraftSchema } from "./hufi-observation-structure";
import { HufiFollowUpProposalSchema } from "./hufi-observation-followup";

// ── Proposal Contract ────────────────────────────────────────────────────
//
// Was Hufi aus der Eingabe extrahiert/vorschlägt hat — reiner Vorschlag,
// keine Autorisierungswirkung, kann verworfen/editiert werden. Entspricht
// fachlich dem heutigen `finding`-Objekt aus
// supabase/functions/hufi-ai-voice-finding/index.ts, erweitert um die
// Pferd-Erkennung, die in der bestehenden Pipeline komplett fehlt (dort
// kommt horseId fix aus der Route, siehe
// docs/hufi-observation-phase-1-contracts.md Abschnitt 4).

// ── Horse Resolution ─────────────────────────────────────────────────────
//
// exact:        genau ein Pferd eindeutig per Name/ID identifiziert
// contextual:   aus dem Seitenkontext übernommen (currentHorseId aus dem
//               Input Contract), nicht aus dem Text selbst erkannt
// ambiguous:    mehrere Kandidaten, Nutzer muss auswählen
// not_found:    kein Pferd mit passendem Namen gefunden
// unauthorized: Pferd gefunden, aber der Nutzer hat keinen Zugriff
//               (kein access_grants-Eintrag / nicht Owner) — siehe
//               is_provider_for_horse() als serverseitige Prüfvorlage
// archived:     Pferd gefunden, aber horse_status = 'archived'/'sold'/
//               'deceased' — Beobachtung fachlich sinnlos
export const HorseResolutionStatusSchema = z.enum([
  "exact",
  "contextual",
  "ambiguous",
  "not_found",
  "unauthorized",
  "archived",
]);
export type HorseResolutionStatus = z.infer<typeof HorseResolutionStatusSchema>;

// Datenschutzarm: nur Anzeigename des Besitzers, keine Kontaktdaten
// (E-Mail/Telefon), da diese Kandidatenliste im Proposal an den Client
// zurückgeht, bevor eine Bestätigung/Autorisierung stattgefunden hat.
export const HorseCandidateSchema = z.object({
  horseId: z.string().uuid(),
  horseName: z.string(),
  owner: z.object({ displayName: z.string() }).optional(),
  confidence: z.number().min(0).max(1),
  matchReason: z.string(),
  /** false z.B. bei archivierten oder nicht-autorisierten Kandidaten —
   * werden trotzdem angezeigt (Transparenz), aber nicht auswählbar. */
  selectable: z.boolean(),
  exclusionReason: z.string().optional(),
});
export type HorseCandidate = z.infer<typeof HorseCandidateSchema>;

export const HufiObservationProposalSchema = z.object({
  proposalId: z.string().uuid(),

  /** Für diesen Flow fest "create_observation" — als literal statt
   * offener String, damit spätere Erweiterungen (weitere Action-Typen)
   * den Union-Typ bewusst erweitern müssen statt implizit mitzulaufen. */
  actionType: z.literal("create_observation"),

  source: ObservationSourceSchema,
  rawTranscript: z.string(),

  horseResolution: HorseResolutionStatusSchema,
  horseCandidates: z.array(HorseCandidateSchema),
  /** Nur gesetzt, wenn horseResolution "exact" oder "contextual" ist. */
  selectedHorseId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),

  observation: ObservationDraftSchema,
  followUp: HufiFollowUpProposalSchema.optional(),

  /** Vom Modell nicht ausgefüllte Pflichtfelder, z.B. ["finding"]. */
  missingFields: z.array(z.string()),

  /** Freitext-Hinweise auf Unklarheiten, z.B. "unklar ob linker oder
   * rechter Huf gemeint". */
  ambiguities: z.array(z.string()),

  /** Gesamt-Konfidenz des Vorschlags. Hinweis: Die heutige Edge Function
   * hufi-ai-voice-finding liefert KEIN confidence-Feld (verifiziert) —
   * müsste in der nächsten Bauphase im Prompt ergänzt werden, hier nur
   * als Contract-Feld vorbereitet. */
  confidence: z.number().min(0).max(1),

  warnings: z.array(z.string()),

  /** Für diesen Flow immer true (Policy "save_observation" verlangt
   * zwingend Bestätigung, siehe hufi-observation-policy.ts) — als literal
   * modelliert, damit kein Aufrufer versehentlich false setzen kann. */
  confirmationRequired: z.literal(true),

  /** Nach diesem Zeitpunkt ist der Vorschlag ungültig (siehe
   * CONFIRMATION_EXPIRED in hufi-observation-error.ts) — verhindert, dass
   * eine Stunden alte KI-Einschätzung ungeprüft übernommen wird, während
   * sich der Datenbestand (z.B. Pferdezuordnung) geändert haben könnte. */
  expiresAt: z.string().datetime(),

  createdAt: z.string().datetime(),
});
export type HufiObservationProposal = z.infer<typeof HufiObservationProposalSchema>;
