import assert from "node:assert/strict";
import test from "node:test";
import { classifyProviderWebhook, constantTimeCompare, hmacSha256Base64, PRODUCT_PRICING } from "./copecart-contract.mjs";

test("valid CopeCart HMAC is accepted and an invalid signature is rejected", async () => {
  const signature = await hmacSha256Base64("test-secret", '{"event_type":"payment.made"}');
  assert.equal(constantTimeCompare(signature, signature), true);
  assert.equal(constantTimeCompare(signature, `${signature}x`), false);
});

test("known purchases activate while unknown products never get a default plan", () => {
  const knownProductIds = ["0a0921ba"];
  assert.equal(classifyProviderWebhook({ eventType: "payment.made", productId: "0a0921ba", knownProductIds }), "activate");
  assert.equal(classifyProviderWebhook({ eventType: "payment.made", productId: "unknown", knownProductIds }), "unknown-product");
});

test("launch pricing keeps HufManager trial separate from HufiApp direct paid", () => {
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.priceMonthlyEur, "19.95");
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.copecartProductId, "3a97bd25");
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.trialDays, 14);
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.priceMonthlyEur, "29.95");
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.trialDays, 0);
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.customerAccess, "free_relationship_scoped");
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.customerAccess, "free_relationship_scoped");
});

test("refunds and chargebacks revoke access while cancellation preserves period-end access", () => {
  const knownProductIds = ["0a0921ba"];
  assert.equal(classifyProviderWebhook({ eventType: "payment.refunded", productId: "0a0921ba", knownProductIds }), "cancel-immediately");
  assert.equal(classifyProviderWebhook({ eventType: "payment.charged_back", productId: "0a0921ba", knownProductIds }), "cancel-immediately");
  assert.equal(classifyProviderWebhook({ eventType: "payment.recurring.cancelled", productId: "0a0921ba", knownProductIds }), "cancel-at-period-end");
});
