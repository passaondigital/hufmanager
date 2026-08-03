import { HufiObservationInputSchema } from "../hufi-observation-input";
import { assertFalse, assertTrue } from "./assert-helpers";

const base = {
  userId: "00000000-0000-0000-0000-000000000001",
  requestId: "00000000-0000-0000-0000-000000000002",
  idempotencyKey: "idem-key-0000000000000001",
  createdAt: new Date().toISOString(),
};

// Gültiger Textinput
assertTrue(
  HufiObservationInputSchema.safeParse({
    ...base,
    source: "text",
    rawInput: "Bei Hope war heute vorne links die äußere Wand ausgebrochen.",
  }).success,
  "gültiger Textinput wird akzeptiert",
);

// Gültiger Voiceinput (mit separatem rawTranscript)
assertTrue(
  HufiObservationInputSchema.safeParse({
    ...base,
    source: "voice",
    rawInput: "Bei Hope war heute vorne links die äußere Wand ausgebrochen.",
    rawTranscript: "bei hope war heute vorne links die äußere wand ausgebrochen",
  }).success,
  "gültiger Voiceinput wird akzeptiert",
);

// Fehlender rawInput
assertFalse(
  HufiObservationInputSchema.safeParse({
    ...base,
    source: "text",
    rawInput: "",
  }).success,
  "leerer rawInput wird abgelehnt",
);

// Ungültige source
assertFalse(
  HufiObservationInputSchema.safeParse({
    ...base,
    source: "telepathy",
    rawInput: "irgendwas",
  }).success,
  "ungültige source wird abgelehnt",
);

// idempotencyKey zu kurz
assertFalse(
  HufiObservationInputSchema.safeParse({
    ...base,
    source: "text",
    rawInput: "irgendwas",
    idempotencyKey: "zu-kurz",
  }).success,
  "zu kurzer idempotencyKey wird abgelehnt",
);
