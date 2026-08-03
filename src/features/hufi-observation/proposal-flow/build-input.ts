import {
  HufiObservationInputSchema,
  type HufiObservationInput,
  type ObservationSource,
} from "../contracts/hufi-observation-input";

export interface BuildInputParams {
  rawInput: string;
  source: ObservationSource;
  /** Client-Kontext für UI/Edge Function — KEINE Autorisierungsgrundlage,
   * siehe Kommentar in hufi-observation-input.ts. Wird hier trotzdem aus
   * der echten Session befüllt (nicht frei erfindbar), damit das Objekt
   * für spätere Bauphasen (echte Ausführung) direkt weiterverwendbar ist. */
  userId: string;
  currentHorseId?: string;
  currentAppointmentId?: string;
  currentRoute?: string;
}

/** Baut ein Input-Contract-Objekt für den Dev-Lab-Flow. idempotencyKey/
 * requestId werden clientseitig generiert (crypto.randomUUID, siehe
 * docs/hufi-observation-phase-1-contracts.md Abschnitt 15) — in dieser
 * Phase ohne serverseitige Wirkung (keine Ausführung), aber strukturell
 * korrekt vorbereitet. */
export function buildObservationInput(params: BuildInputParams): HufiObservationInput {
  const input: HufiObservationInput = {
    source: params.source,
    rawInput: params.rawInput,
    currentRoute: params.currentRoute,
    currentHorseId: params.currentHorseId,
    currentAppointmentId: params.currentAppointmentId,
    userId: params.userId,
    locale: "de-DE",
    requestId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  return HufiObservationInputSchema.parse(input);
}
