import { z } from "zod";

// ── Follow-up Contract ──────────────────────────────────────────────────
//
// Zieltabelle (spätere Bauphase, hier nur benannt, keine Migration):
// `hufi_followup_suggestions` (supabase/migrations/
// 20260715200000_hufi_followup_suggestions.sql) — NICHT "hufi_follow_ups".
// Diese Tabelle existiert bereits real und wird heute vom
// morning-briefing-Cronjob befüllt (Provider-gebunden, `provider_id`,
// `horse_id`, `suggested_date`, `weeks_overdue`, `status`). Der
// Observation-Flow soll diese Tabelle wiederverwenden, nicht ersetzen.
//
// `naechster_termin_wochen` aus der bestehenden AI-Extraktion (siehe
// hufi-observation-structure.ts-Kommentar) landet heute nirgends in der
// Datenbank — dieser Contract ist die Brücke, die das beheben soll.
//
// Regel aus dem Auftrag: entweder relatives Intervall ODER konkretes
// Fälligkeitsdatum, nie beides und nie keins (wenn enabled=true). Der
// Server berechnet das endgültige `dueDate` aus `intervalDays`, falls nur
// das Intervall gesetzt ist — dieser Contract bildet nur den Vorschlag ab,
// nicht die serverseitige Berechnung selbst.
//
// Automatische Terminbuchung ist explizit NICHT Teil dieses Contracts —
// ein Follow-up ist eine Aufgabe/Erinnerung, kein Kalendereintrag (siehe
// docs/hufi-observation-workflow-analysis.md Abschnitt 17, MVP-Grenzen).

export const FollowUpPrioritySchema = z.enum(["low", "normal", "high"]);
export const FollowUpStatusSchema = z.enum([
  "suggested",
  "confirmed",
  "dismissed",
  "done",
]);

const FollowUpFieldsSchema = z.object({
  enabled: z.boolean(),

  /** Relatives Intervall ab Beobachtungsdatum, z.B. 28 für "4 Wochen". */
  intervalDays: z.number().int().positive().optional(),

  /** Alternative zu intervalDays: konkretes Datum. */
  dueDate: z.string().datetime().optional(),

  /** Warum wird die Folgekontrolle vorgeschlagen — für die Anzeige im
   * Task/Reminder, z.B. "Kontrolle nach Nachraspeln, wie empfohlen". */
  reason: z.string(),

  priority: FollowUpPrioritySchema.default("normal"),
  status: FollowUpStatusSchema.default("suggested"),

  /** Wird erst nach erfolgreicher Ausführung bekannt — im Proposal/
   * Confirmation-Schritt immer undefined. */
  horseId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  hoofEntryId: z.string().uuid().optional(),
  actionId: z.string().uuid().optional(),
});

export const HufiFollowUpProposalSchema = FollowUpFieldsSchema.refine(
  (f) => {
    if (!f.enabled) return true;
    const hasInterval = f.intervalDays !== undefined;
    const hasDueDate = f.dueDate !== undefined;
    return hasInterval !== hasDueDate; // genau eines von beiden (XOR)
  },
  {
    message:
      "Wenn enabled=true: genau eines von intervalDays/dueDate angeben, nicht beides und nicht keins",
    path: ["intervalDays"],
  },
);
export type HufiFollowUpProposal = z.infer<typeof HufiFollowUpProposalSchema>;

// Nach Ausführung: horseId ist jetzt Pflicht (die Beobachtung wurde einem
// echten Pferd zugeordnet), Relation zu hoofEntryId/actionId ebenfalls.
export const HufiFollowUpRecordSchema = FollowUpFieldsSchema.extend({
  horseId: z.string().uuid(),
  hoofEntryId: z.string().uuid(),
  actionId: z.string().uuid(),
});
export type HufiFollowUpRecord = z.infer<typeof HufiFollowUpRecordSchema>;
