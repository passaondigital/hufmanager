import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// HufManager-Einladungen aus Edge Functions müssen in der HufManager-App landen.
// hufiapp.de läuft auf einem anderen Supabase-Projekt (oortmejcefbiewaceccc) —
// ein Token aus diesem Projekt wird dort nicht erkannt (Audit 25./28.09.2026).
const fn = (name: string) =>
  readFileSync(join(__dirname, "../../supabase/functions", name, "index.ts"), "utf8");

const LINK_TARGETS = /(redirectTo:\s*"[^"]*"|action_link\s*\|\|\s*"[^"]*"|const appUrl\s*=\s*[^;]*;)/g;

describe("Edge-Function-Einladungslinks (HufManager)", () => {
  for (const name of ["admin-create-user", "send-provider-invitation", "send-employee-invitation"]) {
    it(`${name}: Link-Ziele nur auf https://app.hufmanager.de`, () => {
      const targets = fn(name).match(LINK_TARGETS) ?? [];
      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) {
        expect(t).toContain("https://app.hufmanager.de");
        expect(t).not.toMatch(/hufiapp\.de/);
        expect(t).not.toMatch(/APP_URL/);
      }
    });
  }

  it("Magic-Link-Einladungen landen auf /reset-password (Passwort festlegen)", () => {
    for (const name of ["admin-create-user", "send-provider-invitation"]) {
      expect(fn(name)).toContain('redirectTo: "https://app.hufmanager.de/reset-password"');
    }
  });

  it("send-employee-invitation loggt den Einladungslink (Token) nicht", () => {
    expect(fn("send-employee-invitation")).not.toMatch(/console\.log\([^)]*invitationLink/);
  });
});
