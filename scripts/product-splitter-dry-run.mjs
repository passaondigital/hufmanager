#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.log(JSON.stringify({
    status: "NOT_RUN_ENV_REQUIRED",
    required_env: ["SUPABASE_URL or VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  }, null, 2));
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const countRows = async (table, filter) => {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error && error.code === "42P01") return null;
  if (error) throw error;
  return count || 0;
};

const listRows = async (table, select, filter) => {
  let query = supabase.from(table).select(select);
  if (filter) query = filter(query);
  const { data, error } = await query;
  if (error && error.code === "42P01") return null;
  if (error) throw error;
  return data || [];
};

const classify = (profile, providerSubs, clientSubs, manualPayments) => {
  if (profile.copecart_subscription_id) return "VERIFIED_PAID";
  if (providerSubs.some((row) => ["active", "paid", "verified"].includes(row.status))) return "VERIFIED_PAID";
  if (clientSubs.some((row) => ["active", "paid", "verified"].includes(row.status))) return "VERIFIED_PAID";
  if (manualPayments.some((row) => ["paid", "verified"].includes(row.status))) return "VERIFIED_PAID";
  if (profile.subscription_status === "trialing") return "TRIAL";
  if (profile.subscription_status === "active") return "UNKNOWN_BILLING_STATE";
  if (profile.plan_override && profile.plan_override !== "standard") return "UNKNOWN_BILLING_STATE";
  return "FREE";
};

const main = async () => {
  const profiles = await listRows(
    "profiles",
    "id, signup_app, subscription_status, subscription_plan, plan_override, access_valid_until, copecart_subscription_id",
  );

  const memberships = await listRows("product_memberships", "user_id, product, status");
  const horses = await listRows("horses", "id, owner_id, eqid");
  const providerSubs = await listRows("provider_subscriptions", "provider_id, status");
  const clientSubs = await listRows("client_subscriptions", "client_id, status");
  const manualPayments = await listRows("manual_payments", "provider_id, status");

  const membershipRows = memberships || [];
  const horseRows = horses || [];
  const providerSubRows = providerSubs || [];
  const clientSubRows = clientSubs || [];
  const manualPaymentRows = manualPayments || [];

  const hasMembershipTable = memberships !== null;
  const userIds = new Set(profiles.map((profile) => profile.id));
  const activeHufManager = new Set(membershipRows.filter((row) => row.product === "HUFMANAGER" && row.status === "ACTIVE").map((row) => row.user_id));
  const activeHufiApp = new Set(membershipRows.filter((row) => row.product === "HUFIAPP" && row.status === "ACTIVE").map((row) => row.user_id));
  const horseOwners = new Set(horseRows.map((horse) => horse.owner_id));

  const billingCounts = {
    FREE: 0,
    TRIAL: 0,
    VERIFIED_PAID: 0,
    UNKNOWN_BILLING_STATE: 0,
  };

  for (const profile of profiles) {
    const billingClass = classify(
      profile,
      providerSubRows.filter((row) => row.provider_id === profile.id),
      clientSubRows.filter((row) => row.client_id === profile.id),
      manualPaymentRows.filter((row) => row.provider_id === profile.id),
    );
    billingCounts[billingClass] += 1;
  }

  const relationshipErrors = horseRows.filter((horse) => horse.owner_id && !userIds.has(horse.owner_id)).length;
  const idErrors = horseRows.filter((horse) => !horse.id || !horse.owner_id).length;

  console.log(JSON.stringify({
    status: "READ_ONLY",
    TOTAL_USERS: profiles.length,
    HAS_HUFMANAGER_MEMBERSHIP: activeHufManager.size,
    HAS_HUFIAPP_MEMBERSHIP: activeHufiApp.size,
    NEEDS_PRODUCT_CHOICE: hasMembershipTable
      ? profiles.filter((profile) => !activeHufManager.has(profile.id) && !activeHufiApp.has(profile.id)).length
      : profiles.length,
    FREE: billingCounts.FREE,
    TRIAL: billingCounts.TRIAL,
    VERIFIED_PAID: billingCounts.VERIFIED_PAID,
    UNKNOWN_BILLING_STATE: billingCounts.UNKNOWN_BILLING_STATE,
    USERS_WITH_HORSES: Array.from(horseOwners).filter(Boolean).length,
    RELATIONSHIP_ERRORS: relationshipErrors,
    ID_ERRORS: idErrors,
    product_memberships_table_present: hasMembershipTable,
  }, null, 2));
};

main().catch((error) => {
  console.error(JSON.stringify({ status: "ERROR", message: error.message }, null, 2));
  process.exit(1);
});
