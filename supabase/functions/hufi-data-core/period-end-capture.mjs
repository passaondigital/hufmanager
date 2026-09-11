// Pure, Deno-independent logic for capturing CopeCart's is_cancelled_for
// period-end cancellation date evidence. Extracted out of index.ts so it
// can be unit-tested directly with `node --test`, the same convention
// already used for _shared/copecart-contract.mjs / .node.mjs. Nothing here
// touches Deno, the network, or a database — index.ts imports and calls
// these two functions, no other file needs to change.

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Strict calendar-date check: YYYY-MM-DD only, and the date must actually
// exist (2026-02-31 is rejected, not rolled forward to March). The
// Date.UTC + read-back round-trip catches "syntactically plausible but not
// real" dates that a bare regex cannot, without a date library for one
// check. Pure boolean in, boolean out — no timezone conversion happens
// here at all.
export function isValidIsoDateOnly(value) {
  if (typeof value !== "string" || !ISO_DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Reads is_cancelled_for off a raw CopeCart payload and classifies it into
// exactly three outcomes a caller can act on without re-deriving the rules:
//
//   missing/blank        -> { value: undefined, invalid: false }
//   present, valid date   -> { value: "<verbatim YYYY-MM-DD>", invalid: false }
//   present, not a date   -> { value: undefined, invalid: true, rawLength }
//
// "invalid: true" is the one case a caller should log/flag operationally;
// missing is not an error. `value` is always the exact input string when
// present and valid -- never re-formatted, never converted to a Date/
// timestamp. That conversion belongs to hm_billing_effective_end_at_v1
// later, not to capture.
export function captureIsCancelledFor(payload) {
  const raw = payload && typeof payload === "object" ? payload.is_cancelled_for : undefined;
  if (typeof raw !== "string" || raw.trim() === "") {
    return { value: undefined, invalid: false };
  }
  if (isValidIsoDateOnly(raw)) {
    return { value: raw, invalid: false };
  }
  return { value: undefined, invalid: true, rawLength: raw.length };
}
