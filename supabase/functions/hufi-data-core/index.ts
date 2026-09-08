import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  constantTimeCompare,
  hmacSha256Base64,
} from "../_shared/copecart-contract.mjs";

const jsonHeaders = { "Content-Type": "application/json" };

function okResponse(): Response {
  // CopeCart requires the exact response body "OK" for a successful IPN.
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
    "event_type",
    "event",
    "type",
    "product_id",
    "product_name",
    "product_type",
    "order_id",
    "transaction_id",
    "subscription_id",
    "buyer_id",
    "buyer_email",
    "buyer_firstname",
    "buyer_lastname",
    "buyer_name",
    "line_item_amount",
    "first_payment",
    "amount",
    "currency",
    "payment_status",
    "payment_method",
    "metadata",
    "affiliate_id",
    "vendor_id",
    "event_created_at",
    "created_at",
    "transaction_date",
    "date",
  ] as const;

  const sanitized: Record<string, unknown> = {};
  for (const key of allow) {
    const value = payload[key];
    if (value === undefined || value === null) continue;

    // CopeCart metadata is normally a seller-defined string. Keep it bounded
    // so the event store cannot become an accidental arbitrary-payload sink.
    if (key === "metadata") {
      if (typeof value === "string") sanitized[key] = value.slice(0, 2048);
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 2048);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
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
    const sharedSecret = Deno.env.get("COPECART_IPN_PASSWORD");

    if (!sharedSecret) {
      console.error("[hufi-data-core][copecart] COPECART_IPN_PASSWORD missing");
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
      .filter(Boolean)
      .join(" ") || firstText(payload.buyer_name);
    const amount = parseAmount(payload.line_item_amount ?? payload.first_payment ?? payload.amount);
    const currency = firstText(payload.currency) || "EUR";
    const isTest = typeof providerStatus === "string" && providerStatus.startsWith("test");
    const occurredAt = parseOccurredAt(payload, receivedAt);
    const status = normalizedStatus(eventType, providerStatus);
    const sourceEventId = transactionId
      ? `${eventType}:${transactionId}`
      : `${eventType}:${rawHash}`;

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
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[hufi-data-core][copecart] Supabase runtime configuration missing");
      return errorResponse(500, "Server configuration error");
    }

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

    // ignoreDuplicates makes CopeCart retries idempotent. We only update the
    // latest-state projection when this delivery created a genuinely new event.
    const { data: inserted, error: eventError } = await supabase
      .from("hufi_data_events")
      .upsert(eventRow, {
        onConflict: "source,source_event_id",
        ignoreDuplicates: true,
      })
      .select("id");

    if (eventError) {
      console.error("[hufi-data-core][copecart] event insert failed", eventError.message);
      return errorResponse(500, "Event persistence failed");
    }

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

      if (stateError) {
        console.error("[hufi-data-core][copecart] state projection failed", stateError.message);
        return errorResponse(500, "State persistence failed");
      }
    }

    console.log("[hufi-data-core][copecart] accepted", {
      event_type: eventType,
      source_event_id: sourceEventId,
      product_id: productId,
      duplicate: !inserted || inserted.length === 0,
      test: isTest,
    });
    return okResponse();
  } catch (error) {
    console.error("[hufi-data-core][copecart] unexpected error", error instanceof Error ? error.message : String(error));
    return errorResponse(500, "Webhook processing failed");
  }
});
