// hufi-data-core — recovered local source + minimal period-end capture patch.
//
// PROVENANCE: recovered_from_version=3, Supabase project vnschgjxkzzwzefqlrji,
// deployed bundle sha256 1cfe0fd65b3bdd8cc9b1fc959506ea24291baef1cd91c6bdb0f93ef600bfa1cd,
// fetched read-only via the Supabase management API on 2026-09-11. This file
// had no prior local checkout anywhere on this host (confirmed searched:
// /home/administrator, /srv/hufi/lab/factory/projects/*) — this is the first
// time this function's source has been version-controlled locally. No
// secret, no runtime ENV value, no customer data is contained in this file.
//
// PATCH 1 (recovery commit): sanitizePayload() preserves is_cancelled_for
// (CopeCart's period-end cancellation date evidence) when present and a
// valid YYYY-MM-DD date. See the dedicated comment at that call site for
// the missing/invalid-input strategy.
//
// PATCH 2 (this commit, V2.4.3): the deployed v3 write flow -- a direct
// upsert into hufi_data_events, then a SEPARATE hufi_data_apply_state RPC
// call gated on "was the insert genuinely new" -- is replaced by exactly
// ONE call to the atomic public.hufi_data_ingest_and_project_v1(...) RPC
// (added on XXL-Staging in the prior migration). That two-step flow was
// RETRY_STATE_GAP itself: if the state RPC failed after a successful
// insert, a provider retry would see "duplicate" and skip state
// application again, forever. The atomic RPC removes the "was this call's
// insert the winner" branch entirely -- this Edge Function no longer
// decides whether to apply state, it only maps the RPC's result code to
// an HTTP response. See the atomic RPC's own migration for the full
// event-immutability / collision / out-of-order contract it enforces.
//
// NO DEPLOY: this file is local source only. Applying it requires a
// separate, explicitly authorized `supabase functions deploy` step.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  constantTimeCompare,
  hmacSha256Base64,
} from "../_shared/copecart-contract.mjs";
import { captureIsCancelledFor } from "./period-end-capture.mjs";

const jsonHeaders = { "Content-Type": "application/json" };

function okResponse(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders,
  });
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const normalized = value.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOccurredAt(payload: Record<string, unknown>, fallback: Date): string {
  const candidate = firstText(
    payload.event_created_at,
    payload.created_at,
    payload.transaction_date,
    payload.date,
  );
  if (!candidate) return fallback.toISOString();

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function eventCategory(eventType: string): string {
  if (eventType === "payment.recurring.cancelled" || eventType === "payment.recurring.upcoming") {
    return "subscription";
  }
  if (eventType === "payment.refunded" || eventType === "payment.charged_back") {
    return "refund";
  }
  if (eventType.startsWith("payment.")) return "payment";
  return "event";
}

function normalizedStatus(eventType: string, providerStatus: string | null): string {
  switch (eventType) {
    case "payment.made": return "paid";
    case "payment.trial": return "trial";
    case "payment.recurring.upcoming": return "upcoming";
    case "payment.failed": return "failed";
    case "payment.recurring.cancelled": return "cancelled";
    case "payment.refunded": return "refunded";
    case "payment.charged_back": return "charged_back";
    default: return providerStatus || "unknown";
  }
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const allow = [
    "event_type", "event", "type", "product_id", "product_name", "product_type",
    "order_id", "transaction_id", "subscription_id", "buyer_id", "buyer_email",
    "buyer_firstname", "buyer_lastname", "buyer_name", "line_item_amount",
    "first_payment", "amount", "currency", "payment_status", "payment_method",
    "metadata", "affiliate_id", "vendor_id", "event_created_at", "created_at",
    "transaction_date", "date",
  ] as const;

  const sanitized: Record<string, unknown> = {};
  for (const key of allow) {
    const value = payload[key];
    if (value === undefined || value === null) continue;
    if (key === "metadata") {
      if (typeof value === "string") sanitized[key] = value.slice(0, 2048);
      continue;
    }
    if (typeof value === "string") sanitized[key] = value.slice(0, 2048);
    else if (typeof value === "number" || typeof value === "boolean") sanitized[key] = value;
  }

  // is_cancelled_for (CopeCart period-end cancellation effective-date
  // evidence): kept OUTSIDE the generic allowlist loop above on purpose.
  // Every other allowlisted field above is a length-capped pass-through
  // with no semantic validation; this one field is destined to become
  // billing-effective-end input (hm_billing_effective_end_at_v1, a later
  // step, not this function), so a malformed value must never silently
  // become valid lifecycle evidence. Validation logic lives in
  // period-end-capture.mjs (pure, unit-tested via `node --test`).
  //
  // - Missing or blank: omitted. No invented date (not transaction_date,
  //   not next_payment_at, not now(), not a monthly approximation).
  // - Present but not a real YYYY-MM-DD calendar date: omitted from the
  //   sanitized payload and logged (length only, not the raw value) —
  //   NOT a reason to reject the whole webhook. Rejecting the request
  //   would lose the rest of a real, HMAC-authenticated CopeCart delivery
  //   (status, amount, ids) over one malformed field, and CopeCart has no
  //   reason to retry a delivery that already received 200 OK. The event
  //   itself is still recorded; only this one field's bad value does not
  //   propagate as evidence.
  // - Present and valid: preserved verbatim as the exact YYYY-MM-DD
  //   string — no Date object round-trip on the stored value, no
  //   Europe/Berlin or any other timezone conversion. That conversion is
  //   HM_BILLING_EFFECTIVE_END_V1's job downstream, not this capture step's.
  const cancelledFor = captureIsCancelledFor(payload);
  if (cancelledFor.value !== undefined) {
    sanitized.is_cancelled_for = cancelledFor.value;
  } else if (cancelledFor.invalid) {
    console.warn(
      "[hufi-data-core][copecart] is_cancelled_for present but not a valid YYYY-MM-DD date; omitted from sanitized payload",
      { raw_length: cancelledFor.rawLength },
    );
  }

  return sanitized;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return okResponse();
  if (req.method !== "POST") return errorResponse(405, "Method not allowed");

  try {
    const rawBody = await req.text();
    const receivedSignature = req.headers.get("x-copecart-signature") ?? "";
    const sharedSecret = Deno.env.get("COPECART_DATACORE_SECRET")
      || Deno.env.get("COPECART_IPN_PASSWORD");

    if (!sharedSecret) {
      console.error("[hufi-data-core][copecart] no CopeCart DataCore secret configured");
      return errorResponse(500, "Server configuration error");
    }

    const expectedSignature = await hmacSha256Base64(sharedSecret, rawBody);
    if (!constantTimeCompare(receivedSignature, expectedSignature)) {
      console.warn("[hufi-data-core][copecart] rejected invalid signature", {
        signature_header_present: receivedSignature !== "",
        body_length: rawBody.length,
      });
      return errorResponse(401, "Unauthorized");
    }

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return errorResponse(400, "Invalid JSON payload");
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return errorResponse(400, "Invalid JSON payload");
    }

    const receivedAt = new Date();
    const rawHash = await sha256Hex(rawBody);
    const eventType = firstText(payload.event_type, payload.event, payload.type) || "unknown";
    const productId = firstText(payload.product_id);
    const orderId = firstText(payload.order_id);
    const transactionId = firstText(payload.transaction_id);
    const subscriptionId = firstText(payload.subscription_id) || orderId;
    const providerStatus = firstText(payload.payment_status, payload.status);
    const customerEmail = (firstText(payload.buyer_email, payload.email) || "").toLowerCase() || null;
    const customerName = [firstText(payload.buyer_firstname), firstText(payload.buyer_lastname)]
      .filter(Boolean).join(" ") || firstText(payload.buyer_name);
    const amount = parseAmount(payload.line_item_amount ?? payload.first_payment ?? payload.amount);
    const currency = firstText(payload.currency) || "EUR";
    const isTest = typeof providerStatus === "string" && providerStatus.startsWith("test");
    const occurredAt = parseOccurredAt(payload, receivedAt);
    const status = normalizedStatus(eventType, providerStatus);
    const sourceEventId = transactionId ? `${eventType}:${transactionId}` : `${eventType}:${rawHash}`;

    let entityType = "event";
    let entityId = sourceEventId;
    if (subscriptionId) {
      entityType = "subscription";
      entityId = subscriptionId;
    } else if (orderId) {
      entityType = "order";
      entityId = orderId;
    } else if (transactionId) {
      entityType = "transaction";
      entityId = transactionId;
    }

    const safePayload = sanitizePayload(payload);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return errorResponse(500, "Server configuration error");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Single atomic call: event persistence + state projection happen
    // inside ONE database transaction, decided entirely by
    // hufi_data_ingest_and_project_v1 itself -- this function does not
    // (and must not) decide "insert was new, so also apply state" here
    // anymore. That decision, and the event-immutability / NULL-safe
    // collision check / out-of-order guard behind it, all live in the RPC.
    const { data: ingestResult, error: ingestError } = await supabase
      .rpc("hufi_data_ingest_and_project_v1", {
        _source: "copecart",
        _source_event_id: sourceEventId,
        _event_type: eventType,
        _event_category: eventCategory(eventType),
        _entity_type: entityType,
        _entity_id: entityId,
        _product_id: productId,
        _order_id: orderId,
        _transaction_id: transactionId,
        _subscription_id: subscriptionId,
        _customer_email: customerEmail,
        _customer_name: customerName,
        _amount: amount,
        _currency: currency,
        _status: status,
        _is_test: isTest,
        _occurred_at: occurredAt,
        _received_at: receivedAt.toISOString(),
        _payload_sha256: rawHash,
        _payload: safePayload,
      });

    if (ingestError) {
      console.error("[hufi-data-core][copecart] atomic ingest RPC failed", {
        source_event_id: sourceEventId,
        event_type: eventType,
      });
      return errorResponse(500, "Event ingestion failed");
    }

    const resultCode = (ingestResult as { result_code?: string } | null)?.result_code;

    // Success set: the webhook was processed. A brand-new event, a repair
    // of a previously-incomplete projection, an idempotent identical
    // retry, and a legitimately out-of-order older event that correctly
    // did NOT rewind current state are all a fachlich successful outcome
    // for CopeCart's purposes -- none of them should be retried.
    const SUCCESS_RESULT_CODES = new Set([
      "APPLIED_NEW_EVENT",
      "APPLIED_EXISTING_EVENT_REPAIR",
      "ALREADY_APPLIED",
      "OUT_OF_ORDER_STATE_UNCHANGED",
    ]);

    if (resultCode && SUCCESS_RESULT_CODES.has(resultCode)) {
      return okResponse();
    }

    // EVENT_ID_COLLISION_MISMATCH / INVALID_INPUT / any unexpected result
    // code: fail closed, never swallowed as OK. Log the technical minimum
    // only -- source_event_id, event_type, result_code -- never
    // customer_email, customer_name, or the payload.
    console.error("[hufi-data-core][copecart] atomic ingest did not succeed", {
      source_event_id: sourceEventId,
      event_type: eventType,
      result_code: resultCode ?? "unknown",
    });
    const statusCode = resultCode === "INVALID_INPUT" ? 400 : resultCode === "EVENT_ID_COLLISION_MISMATCH" ? 409 : 500;
    return errorResponse(statusCode, "Event ingestion rejected");
  } catch (error) {
    console.error("[hufi-data-core][copecart] unexpected error", error instanceof Error ? error.message : String(error));
    return errorResponse(500, "Webhook processing failed");
  }
});
