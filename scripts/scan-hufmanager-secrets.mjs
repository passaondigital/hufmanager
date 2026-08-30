#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist");
const scanner = "scripts/scan-hufmanager-secrets.mjs";

const scanRoots = [
  ".github",
  "docs/quarantine",
  "docs/release",
  "release/hufmanager",
  "scripts",
  "src",
  "supabase",
];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    const stat = lstatSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (!stat.isSymbolicLink()) files.push(path);
  }
  return files;
}

const files = scanRoots.flatMap((path) => walk(resolve(root, path)))
  .filter((path) => relative(root, path) !== scanner);
files.push(...walk(dist));

const patterns = [
  ["private-key", new RegExp(`BEGIN (?:RSA |EC )?PRIVATE${" "}KEY`)],
  ["ollama-literal", /(?:OLLAMA_SECRET\s*=|x-ollama-secret[^\n]{0,40})\s*["'][a-f0-9]{32,}["']/i],
  ["github-token", new RegExp(`gh${"p"}_[A-Za-z0-9]{30,}`)],
  ["openai-token", new RegExp(`s${"k"}-[A-Za-z0-9_-]{20,}`)],
];

const findings = [];
for (const path of files) {
  const content = readFileSync(path, "utf8");
  for (const [rule, pattern] of patterns) {
    if (pattern.test(content)) findings.push(`${rule}: ${relative(root, path)}`);
  }
  if (path.startsWith(dist) && /SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY/.test(content)) {
    findings.push(`service-role-marker-in-bundle: ${relative(root, path)}`);
  }
}

if (findings.length) {
  console.error("HUFMANAGER_SECRET_SCAN=FAIL");
  console.error(findings.map((finding) => `  - ${finding}`).join("\n"));
  process.exit(1);
}
console.log(`HUFMANAGER_SECRET_SCAN=PASS files=${files.length}`);
