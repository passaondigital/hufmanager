import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// index.ts cannot be executed under Node (Deno-only imports/globals, same
// constraint documented in period-end-capture.node.mjs). These are static
// source-text assertions proving the V2.4.3 rewire: the old two-step
// upsert+conditional-RPC write flow is gone, exactly one atomic RPC call
// replaces it, and everything this task explicitly said must NOT change
// (HMAC auth, status normalization, source_event_id rule, is_cancelled_for
// capture) is still present verbatim.
const indexTsPath = fileURLToPath(new URL("./index.ts", import.meta.url));
const indexTsSource = readFileSync(indexTsPath, "utf8");

test("DIRECT_HUFI_DATA_EVENTS_UPSERT=NO: no direct upsert into hufi_data_events remains", () => {
  assert.doesNotMatch(indexTsSource, /\.from\(\s*"hufi_data_events"\s*\)/);
  assert.doesNotMatch(indexTsSource, /\.upsert\(/);
});

test("DIRECT_HUFI_DATA_APPLY_STATE_RPC=NO: no separate hufi_data_apply_state RPC call remains", () => {
  assert.doesNotMatch(indexTsSource, /rpc\(\s*"hufi_data_apply_state"/);
});

test("ATOMIC_INGEST_RPC=YES: exactly one call to the atomic ingest RPC", () => {
  const matches = indexTsSource.match(/rpc\(\s*"hufi_data_ingest_and_project_v1"/g) ?? [];
  assert.equal(matches.length, 1);
});

test("the old event-inserted conditional branch is gone", () => {
  assert.doesNotMatch(indexTsSource, /if\s*\(\s*inserted/);
});

test("success result codes are treated as HTTP OK, collision/invalid are not", () => {
  const rpcBlock = indexTsSource.slice(
    indexTsSource.indexOf('rpc("hufi_data_ingest_and_project_v1"'),
    indexTsSource.indexOf("} catch (error)"),
  );
  for (const code of ["APPLIED_NEW_EVENT", "APPLIED_EXISTING_EVENT_REPAIR", "ALREADY_APPLIED", "OUT_OF_ORDER_STATE_UNCHANGED"]) {
    assert.match(rpcBlock, new RegExp(code), `missing success code: ${code}`);
  }
  assert.match(rpcBlock, /EVENT_ID_COLLISION_MISMATCH/);
  assert.match(rpcBlock, /INVALID_INPUT/);
  assert.match(rpcBlock, /return okResponse\(\);/);
  // the failure path must not return okResponse -- must return an error response
  const failureBranch = rpcBlock.slice(rpcBlock.indexOf("did not succeed"));
  assert.doesNotMatch(failureBranch, /okResponse\(\)/);
});

test("collision/invalid-input logging stays PII-free (no customer_email/customer_name/payload)", () => {
  const rpcBlock = indexTsSource.slice(
    indexTsSource.indexOf('rpc("hufi_data_ingest_and_project_v1"'),
    indexTsSource.indexOf("} catch (error)"),
  );
  const failureLogBlock = rpcBlock.slice(rpcBlock.indexOf("did not succeed") - 40, rpcBlock.indexOf("did not succeed") + 300);
  assert.doesNotMatch(failureLogBlock, /customer_email/);
  assert.doesNotMatch(failureLogBlock, /customer_name/);
  assert.doesNotMatch(failureLogBlock, /safePayload/);
});

test("HMAC_AUTH_UNCHANGED: x-copecart-signature + secret fallback still present", () => {
  assert.match(indexTsSource, /x-copecart-signature/);
  assert.match(indexTsSource, /COPECART_DATACORE_SECRET/);
  assert.match(indexTsSource, /COPECART_IPN_PASSWORD/);
  assert.match(indexTsSource, /constantTimeCompare/);
});

test("NORMALIZATION_UNCHANGED: all seven status mappings still present verbatim", () => {
  const mappings = [
    ['"payment.made": return "paid"'],
    ['"payment.trial": return "trial"'],
    ['"payment.recurring.upcoming": return "upcoming"'],
    ['"payment.failed": return "failed"'],
    ['"payment.recurring.cancelled": return "cancelled"'],
    ['"payment.refunded": return "refunded"'],
    ['"payment.charged_back": return "charged_back"'],
  ];
  for (const [needle] of mappings) {
    assert.ok(indexTsSource.includes(needle), `missing mapping: ${needle}`);
  }
});

test("SOURCE_EVENT_ID_UNCHANGED: transactionId-or-hash rule untouched", () => {
  assert.match(indexTsSource, /const sourceEventId = transactionId \? `\$\{eventType\}:\$\{transactionId\}` : `\$\{eventType\}:\$\{rawHash\}`;/);
});

test("IS_CANCELLED_FOR_CAPTURE_PRESERVED: still wired via captureIsCancelledFor", () => {
  assert.match(indexTsSource, /captureIsCancelledFor\(payload\)/);
  assert.match(indexTsSource, /sanitized\.is_cancelled_for = cancelledFor\.value/);
});

test("no hm_lifecycle_events / product_entitlements / pause event names are written here", () => {
  for (const forbidden of [
    "hm_lifecycle_events",
    "product_entitlements",
    "hm_apply_subscription_ended_outcome_v1",
    "subscription_paused",
    "subscription_resumed",
    "subscription_frozen",
  ]) {
    assert.doesNotMatch(indexTsSource, new RegExp(forbidden));
  }
});
