import { z } from "zod";
import { ObservationSourceSchema } from "./hufi-observation-input";

// ── Beobachtungsstruktur ────────────────────────────────────────────────
//
// Feldnamen bewusst an das reale, bereits produktive Schema angelehnt statt
// neu erfunden — Mapping zur bestehenden Voice→Befund-Pipeline
// (src/components/pferdeakte/HufiAIVoiceRecorder.tsx,
// supabase/functions/hufi-ai-voice-finding/index.ts,
// src/components/pferdeakte/PferdeakteHuf.tsx):
//
//   finding        = "befund"       (hoof_analyses.notes, Teil von hoof_entries.description)
//   actionTaken    = "massnahme"    (Teil von hoof_entries.description)
//   recommendation = "empfehlung"   (hoof_analyses.recommendations[])
//   hoofPosition   = welcher der vier hoof_data_{vl,vr,hl,hr}-Slots
//   hoofMeasurements = "huf_werte"  (toe_length_mm, heel_height_mm, ...)
//   urgency        = abgeleitet aus "dringend_tierarzt"/"dringend_osteo"
//   observedAt     = hoof_entries.entry_date
//
// Bewusst NICHT übernommen:
//   - "severity" als eigene Skala — es gibt keine Schweregrad-Spalte im
//     Schema, nur die zwei Dringlichkeits-Flags oben. Eine neue,
//     erfundene Skala würde eine medizinische Kategorisierung suggerieren,
//     die das Modell heute nicht liefert — deshalb `urgency` statt
//     `severity`, mit genau den drei Werten, die real erzeugt werden.
//   - "tags" — keine entsprechende Spalte in hoof_entries/hoof_analyses
//     gefunden. Nicht erfunden, siehe
//     docs/hufi-observation-phase-1-contracts.md Abschnitt 6.
//   - ein zusätzliches freies "notes"-Feld — würde mit `summary` und den
//     drei Kernfeldern kollidieren, siehe Feldliste unten.
//
// Zwei Ausprägungen:
//   - ObservationDraftSchema: lockerer Zustand direkt nach KI-Extraktion
//     (Proposal), Felder überwiegend optional, weil das Modell "null"
//     liefern kann.
//   - NormalizedObservationSchema: strikter Zustand nach Nutzerbestätigung
//     (Execution) — hier müssen die fachlich unverzichtbaren Felder
//     vorhanden sein.

export const HoofPositionSchema = z.enum(["vl", "vr", "hl", "hr"]);
export type HoofPosition = z.infer<typeof HoofPositionSchema>;

export const FrogQualitySchema = z.enum(["healthy", "soft", "thrush", "damaged"]);
export const WallQualitySchema = z.enum(["good", "chipped", "cracked", "thin"]);

// Entspricht 1:1 "huf_werte" aus dem System-Prompt der Edge Function
// hufi-ai-voice-finding — keine neuen Messwerte erfunden.
export const HoofMeasurementsSchema = z.object({
  toeLengthMm: z.number().positive().optional(),
  heelHeightMm: z.number().positive().optional(),
  hoofAngleDegrees: z.number().min(0).max(90).optional(),
  frogQuality: FrogQualitySchema.optional(),
  wallQuality: WallQualitySchema.optional(),
});
export type HoofMeasurements = z.infer<typeof HoofMeasurementsSchema>;

// Abgeleitet aus "dringend_tierarzt"/"dringend_osteo" (zwei Booleans im
// bestehenden System) — hier als ein Feld modelliert, da fachlich exklusiv
// (eine Beobachtung eskaliert an genau eine Stelle, nicht an beide
// gleichzeitig; falls beide zutreffen, ist "vet_recommended" der
// dringlichere Fall und hat Vorrang — Server entscheidet das bei der
// Normalisierung, nicht dieses Schema).
export const ObservationUrgencySchema = z.enum([
  "routine",
  "vet_recommended",
  "osteo_recommended",
]);
export type ObservationUrgency = z.infer<typeof ObservationUrgencySchema>;

// ── Draft (Proposal-Stufe): KI darf vorschlagen, nichts ist final ───────
export const ObservationDraftSchema = z.object({
  /** = befund. KI darf vorschlagen; Nutzer muss vor dem Speichern
   * bestätigen; Server validiert "nicht leer" bei der Normalisierung. */
  finding: z.string().optional(),

  /** = massnahme. Optional (Produktziel nennt "optionale Maßnahme"
   * explizit). KI darf vorschlagen, Nutzer bestätigt. */
  actionTaken: z.string().optional(),

  /** = empfehlung. Optional. KI darf vorschlagen, Nutzer bestätigt. */
  recommendation: z.string().optional(),

  hoofPosition: HoofPositionSchema.optional(),
  hoofMeasurements: HoofMeasurementsSchema.optional(),
  urgency: ObservationUrgencySchema.optional(),

  /** Beobachtungsdatum — Default heute, wie hoof_entries.entry_date. */
  observedAt: z.string().datetime().optional(),

  source: ObservationSourceSchema,
});
export type ObservationDraft = z.infer<typeof ObservationDraftSchema>;

// ── Normalisiert (Execution-Stufe): vom Nutzer bestätigt, serverfertig ──
export const NormalizedObservationSchema = ObservationDraftSchema.extend({
  // Nach Bestätigung ist "finding" fachlich Pflicht — ohne Kernbeobachtung
  // gibt es nichts zu speichern (Server muss das bei VALIDATION_FAILED
  // durchsetzen, siehe hufi-observation-error.ts).
  finding: z.string().min(1, "finding ist nach Bestätigung erforderlich"),
  observedAt: z.string().datetime(),
}).refine(
  (obs) => !obs.hoofMeasurements || Object.keys(obs.hoofMeasurements).length === 0 || !!obs.hoofPosition,
  {
    message: "hoofPosition ist erforderlich, sobald hoofMeasurements gesetzt sind",
    path: ["hoofPosition"],
  },
);
export type NormalizedObservation = z.infer<typeof NormalizedObservationSchema>;
