#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, process.argv[3] || "dist");
const mode = process.argv[2] || "verify";
const baseCommit = "dd7d7faaddc6d10dc6b15d08449986ecaf93d56f";
const securitySource = "ac60af7b542fadfe00dc6410ebd9e11cba7c2ff2";
const infoPath = resolve(dist, "BUILD_INFO");
const manifestPath = resolve(dist, "SHA256SUMS");

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const expectedCommit = process.env.HUFMANAGER_BUILD_COMMIT || "";
const expectedBranch = process.env.HUFMANAGER_BUILD_BRANCH || "detached";

function walk(dir, files = []) {
  for (const name of readdirSync(dir).sort()) {
    const path = resolve(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`release artifact contains symlink: ${relative(dist, path)}`);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function releaseFiles() {
  return walk(dist).filter((path) => path !== manifestPath);
}

function generate() {
  if (!existsSync(resolve(dist, "index.html"))) throw new Error("dist/index.html is missing");
  if (!/^[a-f0-9]{40}$/.test(expectedCommit)) throw new Error("HUFMANAGER_BUILD_COMMIT is missing or invalid");
  const buildInfo = {
    schemaVersion: 1,
    builtAtUtc: new Date().toISOString(),
    git: { commit: expectedCommit, branch: expectedBranch, canonicalBase: baseCommit, securitySource },
    application: { flavor: "hufmanager", targetDomain: "app.hufmanager.de" },
    inputs: {
      packageLockSha256: sha256(resolve(root, "package-lock.json")),
      tourMigrationSha256: sha256(resolve(root, "supabase/migrations/20260817071323_add_daily_tour_live_location.sql")),
      supabaseConfigSha256: sha256(resolve(root, "supabase/config.toml")),
    },
    edgeFunctions: {
      getRoute: {
        sourceSha256: sha256(resolve(root, "supabase/functions/get-route/index.ts")),
        verifyJwt: true,
        productionRollbackAnchor: "version-50",
      },
      getClientTourStatus: {
        sourceSha256: sha256(resolve(root, "supabase/functions/get-client-tour-status/index.ts")),
        verifyJwt: true,
        productionRollbackAnchor: "version-1",
      },
    },
  };
  writeFileSync(infoPath, `${JSON.stringify(buildInfo, null, 2)}\n`);
  const lines = releaseFiles()
    .map((path) => `${sha256(path)}  ${relative(dist, path)}`)
    .sort();
  writeFileSync(manifestPath, `${lines.join("\n")}\n`);
}

function verify() {
  if (!existsSync(infoPath) || !existsSync(manifestPath)) throw new Error("BUILD_INFO or SHA256SUMS is missing");
  const info = JSON.parse(readFileSync(infoPath, "utf8"));
  const failures = [];
  if (!/^[a-f0-9]{40}$/.test(expectedCommit)) failures.push("HUFMANAGER_BUILD_COMMIT is missing or invalid");
  if (info.git?.commit !== expectedCommit) failures.push("BUILD_INFO commit does not match expected HEAD");
  if (info.git?.canonicalBase !== baseCommit) failures.push("canonical base mismatch");
  if (info.git?.securitySource !== securitySource) failures.push("security provenance mismatch");
  if (info.application?.flavor !== "hufmanager") failures.push("artifact flavor is not hufmanager");
  if (info.application?.targetDomain !== "app.hufmanager.de") failures.push("target domain mismatch");
  if (info.inputs?.packageLockSha256 !== sha256(resolve(root, "package-lock.json"))) failures.push("lockfile hash mismatch");

  const expected = new Map();
  for (const line of readFileSync(manifestPath, "utf8").trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) failures.push(`invalid SHA256SUMS row: ${line}`);
    else expected.set(match[2], match[1]);
  }
  const actualFiles = releaseFiles().map((path) => relative(dist, path)).sort();
  for (const file of actualFiles) {
    const actualHash = sha256(resolve(dist, file));
    if (expected.get(file) !== actualHash) failures.push(`artifact hash mismatch: ${file}`);
    expected.delete(file);
  }
  for (const extra of expected.keys()) failures.push(`manifest references missing artifact: ${extra}`);

  const jsBundle = releaseFiles()
    .filter((path) => path.endsWith(".js"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!supabaseUrl || !jsBundle.includes(new URL(supabaseUrl).host)) failures.push("expected Supabase host missing from JS bundle");
  if (!publishableKey || !jsBundle.includes(publishableKey.slice(0, 24))) failures.push("expected publishable-key fingerprint missing from JS bundle");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log(`HUFMANAGER_PROVENANCE=PASS commit=${info.git.commit}`);
  console.log(`HUFMANAGER_ARTIFACT_FILES=${actualFiles.length}`);
}

try {
  if (mode === "generate") generate();
  else if (mode !== "verify") throw new Error(`unknown mode: ${mode}`);
  verify();
} catch (error) {
  console.error("HUFMANAGER_PROVENANCE=FAIL");
  console.error(error.message);
  process.exit(1);
}
