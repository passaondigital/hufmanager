import { z } from "zod";

// ── Input Contract ──────────────────────────────────────────────────────
//
// Was der Nutzer tatsächlich eingegeben hat, plus dem Seitenkontext, in dem
// er sich gerade befindet. Dies ist die ERSTE Stufe des Observation-Flows
// (siehe docs/hufi-observation-phase-1-contracts.md, Abschnitt 6) — reine
// Rohdaten, noch keine KI-Auswertung, noch keine Autorisierung.
//
// WICHTIG (Feldvertrauen): `userId` und `providerId` kommen vom Client und
// dürfen serverseitig NIEMALS direkt übernommen werden — der Server muss
// den authentifizierten Nutzer aus der Session/dem JWT neu auflösen (siehe
// hufi-observation-execution.ts: `authenticatedUserId`/`resolvedProviderId`).
// Diese Felder existieren hier nur, damit UI und Edge Function denselben
// Kontext sehen — sie sind KEINE Autorisierungsgrundlage.
//
// Bewusst KEIN `organizationId`-Feld: Die Recherche zu diesem Contract hat
// zwei parallele Organisationskonzepte im Schema gefunden
// (`organizations`/`profiles.organization_id` sowie `organization_members`)
// — beide sind für den Observation-Flow irrelevant (Konzept 1 ist toter
// Code, nirgends im Anwendungscode beschrieben; Konzept 2 ist strikt auf
// das B2B-Portal-Feature begrenzt). Maßgeblich ist ausschließlich
// `provider_id = auth.uid()`, exakt das Muster von `hoof_analyses` und
// `hufi_followup_suggestions`. Details: docs/hufi-observation-phase-1-contracts.md
// Abschnitt 3.

export const ObservationSourceSchema = z.enum([
  "text",
  "voice",
  "camera",
  "image",
  "document",
]);
export type ObservationSource = z.infer<typeof ObservationSourceSchema>;

export const HufiObservationInputSchema = z.object({
  source: ObservationSourceSchema,

  /** Rohe Nutzereingabe — bei "text" der getippte Text, bei "voice" das
   * bereits (lokal, siehe HufiAIVoiceRecorder.tsx) transkribierte Ergebnis,
   * bei camera/image/document ein Begleittext, falls vorhanden. */
  rawInput: z.string().min(1, "rawInput darf nicht leer sein"),

  /** Nur bei source="voice" gesetzt: das unveränderte Transkript, bevor der
   * Nutzer es im Vorschau-Schritt editiert. Getrennt von `rawInput`
   * gehalten, damit "Originaltext" und "vom Nutzer bearbeiteter Text"
   * (siehe Beobachtungsstruktur) nicht vermischt werden. */
  rawTranscript: z.string().optional(),

  /** Aktuelle Route, z.B. "/pferd/:id/huf" — hilft der Pferd-Erkennung
   * (siehe Proposal Contract: horseResolution "contextual"). */
  currentRoute: z.string().optional(),

  /** Falls der Nutzer bereits auf einer Pferdeakte-Seite ist (heutiges
   * Verhalten von HufiAIVoiceRecorder.tsx: horseId kommt fix als Prop). */
  currentHorseId: z.string().uuid().optional(),

  /** Falls ein Termin im Kontext bekannt ist (heute in der bestehenden
   * Pipeline ungenutzt — appointmentId wird dort hartcodiert null
   * übergeben, siehe docs/hufi-observation-phase-1-contracts.md
   * Abschnitt 4). */
  currentAppointmentId: z.string().uuid().optional(),

  /** Client-supplied — NICHT vertrauenswürdig, siehe Kommentar oben. */
  userId: z.string().uuid(),

  /** Client-supplied — NICHT vertrauenswürdig, siehe Kommentar oben. */
  providerId: z.string().uuid().optional(),

  locale: z.string().default("de-DE"),

  /** Eindeutige Kennung dieser Anfrage — für Tracing/Logs, KEIN
   * Idempotenzschlüssel (siehe idempotencyKey). */
  requestId: z.string().uuid(),

  /** Vom Client generiert, um doppelte Ausführung bei Retry/Doppelklick
   * zu erkennen (serverseitig via Unique-Constraint durchgesetzt — siehe
   * docs/hufi-observation-phase-1-contracts.md Abschnitt 15). Mindestlänge
   * 16, damit triviale/leere Keys keinen falschen Schutz vortäuschen. */
  idempotencyKey: z.string().min(16),

  createdAt: z.string().datetime(),
});

export type HufiObservationInput = z.infer<typeof HufiObservationInputSchema>;
