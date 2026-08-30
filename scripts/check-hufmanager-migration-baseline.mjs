#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const activeDir = resolve(root, "supabase/migrations");
const tourFile = "20260817071323_add_daily_tour_live_location.sql";
const legacyTourFile = "20260815130000_add_daily_tour_live_location.sql";
const inventoryFile = "20260817114000_add_consume_inventory_stock_rpc.sql";
const quarantinePath = resolve(root, "docs/quarantine/migrations", inventoryFile);
const postconditionPath = resolve(root, "supabase/postconditions/hufmanager_slim_production_baseline.sql");
const expected = {
  tour: "9b8f6cffca29ee35d1d09af9b17568567afc15f1d124b673d78129ac7a18e07c",
  inventory: "cbac88c2c791519b275f43aa22a3ff40f77a6f95d286d791dc22e68c1359c66c",
};

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const failures = [];
const active = new Set(readdirSync(activeDir));

if (!active.has(tourFile)) failures.push(`active tour baseline missing: ${tourFile}`);
if (active.has(legacyTourFile)) failures.push(`legacy tour migration remains active: ${legacyTourFile}`);
if (active.has(inventoryFile)) failures.push(`inventory RPC remains in active migrations: ${inventoryFile}`);
if (!existsSync(quarantinePath)) failures.push(`inventory RPC quarantine artifact missing: ${quarantinePath}`);
if (!existsSync(postconditionPath)) failures.push(`read-only postcondition query missing: ${postconditionPath}`);

if (active.has(tourFile) && sha256(resolve(activeDir, tourFile)) !== expected.tour) {
  failures.push("tour SQL no longer matches the production-baseline source hash");
}
if (existsSync(quarantinePath) && sha256(quarantinePath) !== expected.inventory) {
  failures.push("quarantined inventory SQL no longer matches its provenance hash");
}

if (existsSync(postconditionPath)) {
  const sql = readFileSync(postconditionPath, "utf8")
    .replace(/--.*$/gm, "")
    .replace(/'(?:''|[^'])*'/g, "''");
  const forbidden = sql.match(/\b(ALTER|CALL|CREATE|DELETE|DO|DROP|GRANT|INSERT|REVOKE|TRUNCATE|UPDATE)\b/i);
  if (forbidden) failures.push(`postcondition query is not read-only: contains ${forbidden[1].toUpperCase()}`);
}

if (failures.length) {
  console.error("HUFMANAGER_MIGRATION_BASELINE=FAIL");
  console.error(failures.map((failure) => `  - ${failure}`).join("\n"));
  process.exit(1);
}

console.log("HUFMANAGER_MIGRATION_BASELINE=PASS");
console.log(`TOUR_MIGRATION=${tourFile} sha256=${expected.tour}`);
console.log(`INVENTORY_RPC=QUARANTINED sha256=${expected.inventory}`);
console.log("POSTCONDITIONS=READ_ONLY");
