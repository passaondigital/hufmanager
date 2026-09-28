import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// PROD-Trigger validate_appointment_status erlaubt: planned, pending, confirmed, completed, cancelled, no_show, requested.
// Release-Sprint 28.09.2026: drei Anlage-Pfade schrieben "scheduled" → auf PROD abgelehnt.
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

describe("Termin-Status-Vertrag Frontend ↔ DB-Trigger", () => {
  it("kein Frontend-Schreibpfad setzt appointments.status = 'scheduled'", () => {
    const offenders = walk(join(process.cwd(), "src")).filter((f) =>
      /status:\s*["']scheduled["']/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
  it("Rechnungs-Kundentyp des Assistenten ist ein erlaubter Wert", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/hufi-actions.ts"), "utf8");
    expect(src).not.toMatch(/customer_type:\s*"client"/);
  });
});
