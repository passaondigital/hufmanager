#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);

const publicIntentional = new Set([
  "can_submit_review",
  "check_invite_rate_limit",
  "get_public_business_landing",
  "get_public_offers",
  "get_public_review_provider",
  "get_public_reviews",
  "get_public_services",
  "validate_magic_link",
]);

const authenticatedRequired = new Set([
  "consume_hufi_voice_credit",
  "ensure_hufi_voice_credits_current",
  "get_agent_data_hub",
  "get_horse_medical_data",
  "get_hufi_voice_credits",
  "get_partner_shared_data",
  "get_product_membership_context",
  "get_provider_clients",
  "get_user_role",
  "has_role",
  "is_admin",
  "is_master_admin",
  "is_org_admin",
  "is_org_member",
  "is_provider_for_horse",
  "is_organization_member",
  "search_profile_by_readable_id",
  "select_product_membership",
  "use_hufi_credit",
]);

const adminOnly = new Set([
  "admin_repair_user_role",
  "delete_provider_cascade",
  "get_admin_auth_metadata",
]);

const backendOnly = new Set([
  "add_purchased_voice_credits",
  "decrement_plan_usage",
  "increment_plan_usage",
]);

const unused = new Set([
  "complete_recovery",
  "create_token",
  "generate_smart_id",
  "get_token_status",
  "recovery_dashboard_data",
  "search_by_kid",
  "search_client_by_contact",
]);

const suspicious = new Set([
  "delete_client_cascade",
  "delete_horse_safe",
  "generate_random_id",
  "search_horse_by_readable_id",
]);

const internalPrefixes = [
  "auto_",
  "autoflow_",
  "calculate_",
  "check_",
  "cleanup_",
  "create_appointment_status_notification",
  "create_message_notification",
  "generate_",
  "handle_",
  "log_",
  "notify_",
  "prevent_",
  "protect_",
  "set_",
  "sync_",
  "touch_",
  "update_",
  "validate_",
];

function classify(name) {
  if (suspicious.has(name)) return "UNSAFE_OR_SUSPICIOUS";
  if (publicIntentional.has(name) || name.startsWith("get_public_")) return "PUBLIC_INTENTIONAL";
  if (adminOnly.has(name) || name.includes("admin")) return "ADMIN_ONLY";
  if (backendOnly.has(name)) return "BACKEND_ONLY";
  if (unused.has(name)) return "UNUSED";
  if (authenticatedRequired.has(name)) return "AUTHENTICATED_REQUIRED";
  if (internalPrefixes.some((prefix) => name.startsWith(prefix))) return "INTERNAL_TRIGGER_ONLY";
  return "NEEDS_REVIEW";
}

function extractFunctions(sql, file) {
  const results = [];
  const functionRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:(?<schema>[a-zA-Z0-9_]+)\.)?(?<name>[a-zA-Z0-9_]+)\s*\((?<args>[\s\S]*?)\)(?<body>[\s\S]*?)(?=\nCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|\nCREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER|\nALTER\s+FUNCTION|\nDROP\s+FUNCTION|\nGRANT\s+|\nREVOKE\s+|$)/gi;

  for (const match of sql.matchAll(functionRegex)) {
    const body = match.groups?.body ?? "";
    if (!/SECURITY\s+DEFINER/i.test(body)) continue;

    const rawArgs = match.groups?.args ?? "";
    const normalizedArgs = rawArgs
      .replace(/--.*$/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    results.push({
      file,
      schema: match.groups?.schema ?? "public",
      name: match.groups?.name ?? "unknown",
      args: normalizedArgs,
      hasSearchPath: /SET\s+search_path/i.test(body),
    });
  }

  return results;
}

const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const latestByName = new Map();
for (const file of files) {
  const sql = readFileSync(join(migrationsDir.pathname, file), "utf8");
  for (const fn of extractFunctions(sql, file)) {
    latestByName.set(`${fn.schema}.${fn.name}`, fn);
  }
}

const functions = [...latestByName.values()].sort((a, b) =>
  `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`),
);

const byClassification = {};
for (const fn of functions) {
  const classification = classify(fn.name);
  byClassification[classification] ??= [];
  byClassification[classification].push(`${fn.schema}.${fn.name}`);
}

const summary = {
  security_definer_total: functions.length,
  classifications: Object.fromEntries(
    Object.entries(byClassification)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, { count: value.length, functions: value }]),
  ),
  missing_search_path: functions
    .filter((fn) => !fn.hasSearchPath)
    .map((fn) => `${fn.schema}.${fn.name}`),
};

console.log(JSON.stringify(summary, null, 2));
