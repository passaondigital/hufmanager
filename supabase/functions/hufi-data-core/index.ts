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
// PATCH (this recovery commit): everything below is the deployed v3 body
// unchanged, except sanitizePayload() now also preserves is_cancelled_for
// (CopeCart's period-end cancellation date evidence) when present and a
// valid YYYY-MM-DD date. See the dedicated comment at that call site for
// the missing/invalid-input strategy. The known RETRY_STATE_GAP (event
// insert can succeed while the subsequent hufi_data_apply_state RPC fails,
// and a retry then sees "duplicate" and skips state application) is left
// exactly as deployed — a separate, later fix, not touched here.
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

    const eventRow = {
      source: "copecart",
      source_event_id: sourceEventId,
      event_type: eventType,
      event_category: eventCategory(eventType),
      entity_type: entityType,
      entity_id: entityId,
      product_id: productId,
      order_id: orderId,
      transaction_id: transactionId,
      subscription_id: subscriptionId,
      customer_email: customerEmail,
      customer_name: customerName,
      amount,
      currency,
      status,
      is_test: isTest,
      occurred_at: occurredAt,
      received_at: receivedAt.toISOString(),
      payload_sha256: rawHash,
      payload: safePayload,
    };

    const { data: inserted, error: eventError } = await supabase
      .from("hufi_data_events")
      .upsert(eventRow, { onConflict: "source,source_event_id", ignoreDuplicates: true })
      .select("id");

    if (eventError) return errorResponse(500, "Event persistence failed");

    if (inserted && inserted.length > 0) {
      const { error: stateError } = await supabase.rpc("hufi_data_apply_state", {
        _source: "copecart",
        _entity_type: entityType,
        _entity_id: entityId,
        _last_source_event_id: sourceEventId,
        _last_event_type: eventType,
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
        _last_occurred_at: occurredAt,
        _last_received_at: receivedAt.toISOString(),
        _data: safePayload,
      });
      if (stateError) return errorResponse(500, "State persistence failed");
    }

    return okResponse();
  } catch (error) {
    console.error("[hufi-data-core][copecart] unexpected error", error instanceof Error ? error.message : String(error));
    return errorResponse(500, "Webhook processing failed");
  }
});
