// Smoke-Test nach jedem Deploy (fest verankert in deploy.sh).
// Lädt die Live-URL headless, prüft dass #root wirklich gefüllt ist
// und dass keine Uncaught-Errors auftraten. Exit-Code 0 = ok, 1 = fehlgeschlagen.
//
// Nutzt eine global installierte Playwright-Instanz (npm install -g playwright),
// damit kein zusätzlicher Download/Build-Schritt im Deploy-Worktree nötig ist.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("/usr/lib/node_modules/playwright");

const url = process.argv[2] || "https://hufiapp.de/";
const MIN_ROOT_LENGTH = 500; // React-Landingpage rendert deutlich mehr als das

const errors = [];
const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

let rootLength = 0;
let navigationFailed = false;
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  rootLength = await page.evaluate(
    () => document.getElementById("root")?.innerHTML.length || 0
  );
} catch (e) {
  navigationFailed = true;
  errors.push(`Navigation fehlgeschlagen: ${e.message}`);
}

await browser.close();

console.log(`Smoke-Test: ${url}`);
console.log(`  root innerHTML Länge: ${rootLength}`);
console.log(`  Uncaught page errors: ${errors.length}`);
if (errors.length) console.log("    " + errors.join("\n    "));
console.log(`  Console-Errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log("    " + consoleErrors.join("\n    "));

const failed = navigationFailed || errors.length > 0 || rootLength < MIN_ROOT_LENGTH;

if (failed) {
  console.error("❌ SMOKE-TEST FEHLGESCHLAGEN");
  process.exit(1);
}

console.log("✅ Smoke-Test bestanden");
process.exit(0);
