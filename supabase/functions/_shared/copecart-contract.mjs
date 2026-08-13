export const PAYMENT_EVENTS = ["payment.made", "payment.trial", "payment.recurring.upcoming"];
export const CANCELLATION_EVENTS = ["payment.recurring.cancelled", "payment.refunded", "payment.charged_back"];
export const FAILURE_EVENTS = ["payment.failed"];
export const PRODUCT_PRICING = Object.freeze({
  HUFMANAGER_SLIM: Object.freeze({
    product: "HUFMANAGER",
    plan: "HUFMANAGER_SLIM",
    copecartProductId: "3a97bd25",
    checkoutUrl: "https://copecart.com/products/3a97bd25/checkout",
    priceMonthlyEur: "19.95",
    trialDays: 14,
    customerAccess: "free_relationship_scoped",
  }),
  HUFIAPP_PREMIUM: Object.freeze({
    product: "HUFIAPP",
    plan: "HUFIAPP_PREMIUM",
    priceMonthlyEur: "29.95",
    trialDays: 0,
    customerAccess: "free_relationship_scoped",
  }),
});

export async function hmacSha256Base64(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function constantTimeCompare(a, b) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length, 1);
  let result = aBytes.length ^ bBytes.length;
  for (let index = 0; index < maxLength; index += 1) {
    result |= (index < aBytes.length ? aBytes[index] : 0) ^ (index < bBytes.length ? bBytes[index] : 0);
  }
  return result === 0;
}

export function classifyProviderWebhook({ eventType, productId, knownProductIds }) {
  const isPayment = PAYMENT_EVENTS.includes(eventType);
  if (isPayment && !knownProductIds.includes(productId)) return "unknown-product";
  if (isPayment) return "activate";
  if (FAILURE_EVENTS.includes(eventType)) return "past-due";
  if (eventType === "payment.recurring.cancelled") return "cancel-at-period-end";
  if (CANCELLATION_EVENTS.includes(eventType)) return "cancel-immediately";
  return "ignore";
}
