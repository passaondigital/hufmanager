#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ESLint } from "eslint";

const root = resolve(new URL("..", import.meta.url).pathname);
const baselinePath = resolve(root, "release/hufmanager/lint-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

const scope = [...new Set(baseline.scope)].sort();
let reports;
try {
  const eslint = new ESLint({ cwd: root });
  reports = await eslint.lintFiles(scope);
} catch (error) {
  console.error(`Scoped ESLint could not run: ${error.message}`);
  process.exit(1);
}

const actual = {};
let errors = 0;
let warnings = 0;
for (const report of reports) {
  const file = report.filePath.replace(`${root}/`, "");
  for (const finding of report.messages) {
    const key = `${finding.severity}:${finding.ruleId ?? "parse-error"}`;
    actual[file] ??= {};
    actual[file][key] = (actual[file][key] ?? 0) + 1;
    if (finding.severity === 2) errors += 1;
    if (finding.severity === 1) warnings += 1;
  }
}

const regressions = [];
for (const [file, findings] of Object.entries(actual)) {
  for (const [key, count] of Object.entries(findings)) {
    const allowed = baseline.allowances[file]?.[key] ?? 0;
    if (count > allowed) regressions.push(`${file} ${key}: ${count} > baseline ${allowed}`);
  }
}

if (regressions.length) {
  console.error("HUFMANAGER_SCOPED_LINT=FAIL");
  console.error(regressions.map((entry) => `  - ${entry}`).join("\n"));
  process.exit(1);
}

console.log(`HUFMANAGER_SCOPED_LINT=PASS files=${scope.length} existing_errors=${errors} existing_warnings=${warnings}`);
console.log(`HUFMANAGER_LINT_BASE=${baseline.baseCommit}`);
