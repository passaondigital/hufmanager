#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyProviderWebhook, PRODUCT_PRICING } from "../supabase/functions/_shared/copecart-contract.mjs";

const entitlementMigration = readFileSync(
  new URL("../supabase/migrations/20260813102303_product_entitlements_trial_billing_prepared.sql", import.meta.url),
  "utf8",
);
const webhookSource = readFileSync(
  new URL("../supabase/functions/copecart-webhook/index.ts", import.meta.url),
  "utf8",
);

test("HufManager Slim launch price and trial are product-specific", () => {
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.priceMonthlyEur, "19.95");
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.trialDays, 14);
  assert.match(entitlementMigration, /trial_ends_at = trial_started_at \+ interval '14 days'/);
  assert.match(entitlementMigration, /start_hufmanager_trial/);
});

test("HufiApp has no automatic trial in the shared product model", () => {
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.priceMonthlyEur, "29.95");
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.trialDays, 0);
  assert.match(entitlementMigration, /product <> 'HUFIAPP'\s+OR trial_status = 'NONE'/);
});

test("customer access stays free and relationship-scoped", () => {
  assert.equal(PRODUCT_PRICING.HUFMANAGER_SLIM.customerAccess, "free_relationship_scoped");
  assert.equal(PRODUCT_PRICING.HUFIAPP_PREMIUM.customerAccess, "free_relationship_scoped");
});

test("unknown CopeCart product fails closed instead of defaulting to pro", () => {
  assert.equal(
    classifyProviderWebhook({ eventType: "payment.made", productId: "unknown", knownProductIds: ["0a0921ba"] }),
    "unknown-product",
  );
  assert.doesNotMatch(webhookSource, /return PRODUCT_PLAN_MAP\[productId\] \|\| ['"]pro['"]/);
  assert.match(webhookSource, /return PRODUCT_PLAN_MAP\[productId\] \?\? null/);
});

test("new CopeCart product ids are config-required and do not repurpose legacy ids", () => {
  assert.match(webhookSource, /HUFMANAGER_SLIM_PRODUCT_ID/);
  assert.match(webhookSource, /HUFIAPP_STANDARD_PRODUCT_ID/);
  assert.match(webhookSource, /CONFIG_REQUIRED/);
  assert.match(webhookSource, /NEW_SAAS_PRODUCT_MAP/);
});

test("duplicate SaaS billing events are idempotency-guarded", () => {
  assert.match(entitlementMigration, /saas_billing_events_provider_event_unique UNIQUE \(provider, event_id\)/);
  assert.match(webhookSource, /Duplicate payment event acknowledged/);
});

test("legacy profile trial defaults are not changed by the new migration", () => {
  assert.doesNotMatch(entitlementMigration, /ALTER TABLE public\.profiles[\s\S]*trial_ends_at/i);
  assert.doesNotMatch(entitlementMigration, /ALTER TABLE public\.profiles[\s\S]*subscription_status/i);
});
