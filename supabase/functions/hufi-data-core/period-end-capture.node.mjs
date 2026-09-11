import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { captureIsCancelledFor, isValidIsoDateOnly } from "./period-end-capture.mjs";

// index.ts itself cannot be imported here: it uses Deno-only imports
// (deno.land/std, Deno.env) and only runs under the Deno Edge Function
// runtime, not Node. That is also true of the pre-existing, already-live
// hufi-data-core deployment -- this constraint is not introduced by this
// patch. Everything semantically new in this patch (the date validation
// and capture decision) was extracted into period-end-capture.mjs
// specifically so it has no such dependency and can be unit-tested
// directly, matching the same convention already used for
// _shared/copecart-contract.mjs / .node.mjs. Where a property can only be
// verified about the wiring in index.ts itself (does it still contain the
// original allowlist fields, does it avoid creating lifecycle events), the
// tests below read index.ts's source text directly rather than executing it.
const indexTsPath = fileURLToPath(new URL("./index.ts", import.meta.url));
const indexTsSource = readFileSync(indexTsPath, "utf8");

test("1. valid is_cancelled_for is preserved exactly", () => {
  const result = captureIsCancelledFor({ is_cancelled_for: "2026-10-31" });
  assert.equal(result.value, "2026-10-31");
  assert.equal(result.invalid, false);
});

test("2. leap year Feb 29 is a valid date", () => {
  assert.equal(isValidIsoDateOnly("2028-02-29"), true);
  const result = captureIsCancelledFor({ is_cancelled_for: "2028-02-29" });
  assert.equal(result.value, "2028-02-29");
  assert.equal(result.invalid, false);
});

test("3. non-existent calendar date (Feb 31) is rejected, not rolled forward", () => {
  assert.equal(isValidIsoDateOnly("2026-02-31"), false);
  const result = captureIsCancelledFor({ is_cancelled_for: "2026-02-31" });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, true);
});

test("4. non-ISO format (DD.MM.YYYY) is rejected", () => {
  assert.equal(isValidIsoDateOnly("31.10.2026"), false);
  const result = captureIsCancelledFor({ is_cancelled_for: "31.10.2026" });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, true);
});

test("5. a timestamp is rejected under the DATE-only contract", () => {
  assert.equal(isValidIsoDateOnly("2026-10-31T00:00:00Z"), false);
  const result = captureIsCancelledFor({ is_cancelled_for: "2026-10-31T00:00:00Z" });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, true);
});

test("6. missing is_cancelled_for is not invented and is not flagged invalid", () => {
  const result = captureIsCancelledFor({ event_type: "payment.made" });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, false);
});

test("6b. blank is_cancelled_for is treated the same as missing, not as invalid", () => {
  const result = captureIsCancelledFor({ is_cancelled_for: "   " });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, false);
});

test("7. index.ts wires captureIsCancelledFor into sanitizePayload", () => {
  const sanitizeBody = indexTsSource.slice(
    indexTsSource.indexOf("function sanitizePayload"),
    indexTsSource.indexOf("async function sha256Hex"),
  );
  assert.match(sanitizeBody, /captureIsCancelledFor\(payload\)/);
  assert.match(sanitizeBody, /sanitized\.is_cancelled_for = cancelledFor\.value/);
});

test("8. the original provider-field allowlist has no regression", () => {
  const originalAllowlist = [
    "event_type", "event", "type", "product_id", "product_name", "product_type",
    "order_id", "transaction_id", "subscription_id", "buyer_id", "buyer_email",
    "buyer_firstname", "buyer_lastname", "buyer_name", "line_item_amount",
    "first_payment", "amount", "currency", "payment_status", "payment_method",
    "metadata", "affiliate_id", "vendor_id", "event_created_at", "created_at",
    "transaction_date", "date",
  ];
  const allowlistLiteral = indexTsSource.slice(
    indexTsSource.indexOf("const allow = ["),
    indexTsSource.indexOf("] as const;"),
  );
  for (const field of originalAllowlist) {
    assert.match(allowlistLiteral, new RegExp(`"${field}"`), `missing allowlisted field: ${field}`);
  }
  // is_cancelled_for is deliberately NOT in the generic allowlist (it needs
  // semantic date validation, not a length-capped pass-through) -- see
  // period-end-capture.mjs and the comment at its call site in index.ts.
  assert.doesNotMatch(allowlistLiteral, /"is_cancelled_for"/);
});

test("9, 10, 11, DO_NOT_CREATE_LIFECYCLE_EVENTS: no lifecycle event name is ever produced by this capture step", () => {
  // hufi-data-core only ever writes hufi_data_events / hufi_data_state
  // (confirmed by reading the deployed v3 source before this patch); this
  // patch adds a capture-only field and must not change that. Asserting
  // none of these literal event names appear anywhere in the recovered
  // source is a stronger guarantee than testing individual event-type
  // branches, because it also fails if a later edit ever tried to add one.
  const forbiddenLifecycleEventNames = [
    "subscription_cancelled",
    "subscription_ended",
    "subscription_paused",
    "subscription_resumed",
    "subscription_frozen",
  ];
  for (const name of forbiddenLifecycleEventNames) {
    assert.doesNotMatch(indexTsSource, new RegExp(name), `index.ts must never reference ${name}`);
  }
  // payment.failed / payment.refunded / payment.charged_back still only
  // normalize to their own status strings, unchanged from the deployed
  // baseline -- not "ended".
  assert.match(indexTsSource, /case "payment\.failed": return "failed";/);
  assert.match(indexTsSource, /case "payment\.refunded": return "refunded";/);
  assert.match(indexTsSource, /case "payment\.charged_back": return "charged_back";/);
});

test("12. payment.recurring.cancelled without is_cancelled_for invents no period-end date", () => {
  const result = captureIsCancelledFor({ event_type: "payment.recurring.cancelled" });
  assert.equal(result.value, undefined);
  assert.equal(result.invalid, false);
});

test("captureIsCancelledFor never mutates the input payload", () => {
  const payload = { event_type: "payment.recurring.cancelled", is_cancelled_for: "2026-10-31", buyer_email: "x@example.com" };
  const before = JSON.stringify(payload);
  captureIsCancelledFor(payload);
  assert.equal(JSON.stringify(payload), before);
});
