import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Admin-angelegte Standard-Provider müssen den kanonischen Slim-Trial bekommen.
// Der Trial startet nur über den Rollen-Insert in handle_new_user, und der liest
// signup_app aus den user_metadata des Auth-Inserts — ein späteres Profil-Update
// reicht NICHT (Audit 28.09.2026). DB-Verhalten: scripts/hufmanager-admin-provider-trial-tests.sql.
const src = readFileSync(
  join(__dirname, "../../supabase/functions/admin-create-user/index.ts"),
  "utf8",
);

describe("admin-create-user: Slim-Trial für Standard-Provider", () => {
  it("signup_app=hufmanager nur ohne planOverride", () => {
    expect(src).toMatch(/const isStandardSlimProvider = !planOverride;/);
    expect(src).toMatch(/\.\.\.\(isStandardSlimProvider \? \{ signup_app: "hufmanager" \} : \{\}\)/);
  });

  it("beide createUser-Pfade (mit und ohne Passwort) nutzen dieselben Metadaten", () => {
    const calls = src.match(/auth\.admin\.createUser\(\{[\s\S]*?\}\);/g) ?? [];
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call).toContain("user_metadata: userMetadata");
    }
  });

  it("baut keinen eigenen Trial-Writer", () => {
    expect(src).not.toMatch(/hm_lifecycle_events|trial_started|hm_start_hufmanager_slim_trial_v1\s*\(/);
    expect(src).not.toMatch(/from\("product_entitlements"\)\s*\.(insert|upsert|update|delete)/);
  });

  it("signup_app wird nicht nachträglich per Profil-Update gesetzt", () => {
    expect(src).not.toMatch(/profileUpdate\.signup_app|signup_app:\s*"hufmanager",\s*\n\s*\}\)\s*\.eq\("id"/);
  });
});
