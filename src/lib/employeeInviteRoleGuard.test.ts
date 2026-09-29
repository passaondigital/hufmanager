import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// GoTrue schreibt app_metadata bei admin.createUser erst nach dem Auth-INSERT; handle_new_user
// vergibt deshalb die Default-Rolle 'provider' (PROD-E2E 29.09.2026: Mitarbeiter-Login hing auf /auth).
const src = readFileSync(
  join(__dirname, "../../supabase/functions/accept-employee-invitation/index.ts"),
  "utf8",
);

describe("accept-employee-invitation Rollenbereinigung", () => {
  it("entfernt die Default-Rolle 'provider' des neuen Kontos vor dem Setzen von 'employee'", () => {
    const cleanup = src.search(/\.from\("user_roles"\)\s*\.delete\(\)\s*\.eq\("user_id", userId\)\s*\.eq\("role", "provider"\)/);
    const employeeInsert = src.search(/\.insert\(\{ user_id: userId, role: "employee" \}\)/);
    expect(cleanup).toBeGreaterThan(-1);
    expect(employeeInsert).toBeGreaterThan(cleanup);
  });

  it("bricht bei fehlgeschlagener Bereinigung ab und löscht das halbe Konto", () => {
    const block = src.slice(src.indexOf("providerRoleError) {"), src.indexOf("// Add employee role"));
    expect(block).toMatch(/deleteUser\(userId\)/);
    expect(block).toMatch(/status: 500/);
  });
});
