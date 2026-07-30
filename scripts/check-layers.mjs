#!/usr/bin/env node
// Ebenen-Leiter-Prüfung (Etappe 2). Läuft ohne Browser und ohne Login:
//   node scripts/check-layers.mjs
// Prüft drei Dinge, die beim Umstellen der ~60 Fundstellen schiefgehen können:
//   1. Sind alle sieben Stufen in src/index.css definiert, in aufsteigender
//      Reihenfolge und ohne Doppelbelegung?
//   2. Kennt die AKTIVE Tailwind-Konfiguration (tailwind.config.js — .ts wird
//      von Tailwind ignoriert) jede Stufe als Klasse?
//   3. Legt sich irgendwo noch ein `fixed`-Element mit einer freien Zahl über
//      den Inhalt, statt eine Stufe zu benutzen? Das sind die Fälle, in denen
//      ein Dialog unter einer Leiste verschwindet.
// Beendet mit Code 1, wenn etwas nicht stimmt.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const LADDER = ["bar", "fab", "mode", "dialog", "menu", "tour", "toast"];

// Lokale Stapel INNERHALB eines eigenen Stapelkontexts (Leaflet-Karten-Panes,
// Kamera-Overlays, Canvas-Editor). Die Zahlen dort sind bewusst frei: das
// Elternteil hat schon eine Stufe, die Kinder ordnen sich nur untereinander.
const LOCAL_STACKS = [
  "src/components/tour-manager/",
  "src/components/camera/HufiCam.tsx",
  "src/components/office/canvas/",
  "src/components/day-cockpit/CockpitUnderway.tsx",
  "src/components/ui/navigation-menu.tsx",
];

const problems = [];

// ── 1) Stufen in index.css ───────────────────────────────────────────────────
const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
const values = LADDER.map((name) => {
  const m = css.match(new RegExp(`--z-${name}:\\s*(\\d+)`));
  if (!m) problems.push(`index.css: Stufe --z-${name} fehlt`);
  return m ? Number(m[1]) : NaN;
});
values.forEach((v, i) => {
  if (i > 0 && !(v > values[i - 1])) {
    problems.push(`Reihenfolge kaputt: --z-${LADDER[i]} (${v}) liegt nicht über --z-${LADDER[i - 1]} (${values[i - 1]})`);
  }
});
if (new Set(values).size !== values.length) problems.push("Zwei Stufen haben denselben Wert");

// ── 2) Tailwind-Klassen ──────────────────────────────────────────────────────
const tw = readFileSync(join(ROOT, "tailwind.config.js"), "utf8");
for (const name of LADDER) {
  if (!new RegExp(`${name}:\\s*"var\\(--z-${name}\\)"`).test(tw)) {
    problems.push(`tailwind.config.js: Klasse z-${name} fehlt`);
  }
}

// ── 3) Freie Zahlen an fixed-Elementen ───────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

for (const file of walk(join(ROOT, "src"))) {
  const rel = file.slice(ROOT.length);
  if (LOCAL_STACKS.some((prefix) => rel.startsWith(prefix))) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Tailwind: className="fixed … z-[123]"
    const twHit = line.match(/z-\[(\d+)\]/);
    if (twHit && Number(twHit[1]) >= 40) {
      problems.push(`${rel}:${i + 1} nutzt z-[${twHit[1]}] statt einer Stufe`);
    }
    // Inline: style={{ … zIndex: 123 }} — 0 ist erlaubt (Wasserzeichen etc.)
    const inlineHit = line.match(/zIndex:\s*(\d+)/);
    if (inlineHit && Number(inlineHit[1]) >= 40) {
      problems.push(`${rel}:${i + 1} nutzt zIndex: ${inlineHit[1]} statt var(--z-…)`);
    }
  });
}

// ── Ergebnis ─────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error("Ebenen-Prüfung FEHLGESCHLAGEN:\n" + problems.map((p) => "  · " + p).join("\n"));
  process.exit(1);
}
console.log("Ebenen-Prüfung ok — Leiter: " + LADDER.map((n, i) => `${n}=${values[i]}`).join(" < "));
