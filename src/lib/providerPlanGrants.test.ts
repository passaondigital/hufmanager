import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MANUAL_GRANT_BY_PLAN,
  PROVIDER_PLAN_OPTIONS,
  isSelectableProviderPlan,
  planRequiresEndDate,
  validateProviderPlanGrant,
} from "./providerPlanGrants";

const now = new Date("2026-09-28T12:00:00Z");
const LEGACY = [
  "copecart_starter", "copecart_pro", "copecart_duo", "copecart_team",
  "copecart_anfaenger", "copecart_fortgeschritten", "copecart_profi",
];

describe("Provider-Planauswahl (Owner-Matrix 28.09.2026)", () => {
  it("bietet genau Standard, Lifetime, Barzahlung, Beta an", () => {
    expect(PROVIDER_PLAN_OPTIONS.map((o) => o.value)).toEqual(["standard", "lifetime_grant", "manual_cash_1y", "beta_tester"]);
    expect(PROVIDER_PLAN_OPTIONS[0].label).toBe("HufManager Slim – 14 Tage testen, danach 19,95 €/Monat");
  });

  it("T10 Legacy-CopeCart und employee sind nicht auswählbar", () => {
    for (const plan of [...LEGACY, "employee"]) {
      expect(isSelectableProviderPlan(plan)).toBe(false);
      expect(validateProviderPlanGrant(plan, "2027-01-01", now).ok).toBe(false);
    }
  });

  it("Grant-Arten sind fest zugeordnet, nie ein Paid-Status", () => {
    expect(MANUAL_GRANT_BY_PLAN).toEqual({
      lifetime_grant: "MANUAL_LIFETIME",
      manual_cash_1y: "MANUAL_FIXED_TERM",
      beta_tester: "BETA_ACCESS",
    });
  });

  it("Standard und Lifetime ohne Enddatum", () => {
    expect(planRequiresEndDate("standard")).toBe(false);
    expect(planRequiresEndDate("lifetime_grant")).toBe(false);
    expect(validateProviderPlanGrant("lifetime_grant", "2030-01-01", now)).toEqual({ ok: true, validUntil: null });
  });

  it("T5/T8 Barzahlung und Beta ohne Enddatum → BLOCK", () => {
    expect(validateProviderPlanGrant("manual_cash_1y", "", now).ok).toBe(false);
    expect(validateProviderPlanGrant("beta_tester", "", now).ok).toBe(false);
  });

  it("Enddatum in der Vergangenheit → BLOCK, Zukunft → exakt übernommen", () => {
    expect(validateProviderPlanGrant("manual_cash_1y", "2026-09-01", now).ok).toBe(false);
    expect(validateProviderPlanGrant("beta_tester", "2027-01-15", now)).toEqual({ ok: true, validUntil: "2027-01-15T00:00:00.000Z" });
  });
});

const edge = readFileSync(join(__dirname, "../../supabase/functions/admin-create-user/index.ts"), "utf8");

describe("admin-create-user: Owner-Grants über den kanonischen Writer", () => {
  it("gleiche Planzuordnung wie das Frontend", () => {
    expect(edge).toContain('lifetime_grant: "MANUAL_LIFETIME"');
    expect(edge).toContain('manual_cash_1y: "MANUAL_FIXED_TERM"');
    expect(edge).toContain('beta_tester: "BETA_ACCESS"');
  });

  it("lehnt nicht zulässige Pläne vor der Anlage ab", () => {
    const reject = edge.indexOf("ist für neue Provider nicht mehr zulässig");
    const create = edge.indexOf("auth.admin.createUser(");
    expect(reject).toBeGreaterThan(0);
    expect(reject).toBeLessThan(create);
  });

  it("verlangt Enddatum für Barzahlung/Beta vor der Anlage", () => {
    const check = edge.indexOf("Enddatum in der Zukunft ist für Barzahlung/Beta erforderlich");
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(edge.indexOf("auth.admin.createUser("));
  });

  it("vergibt Zugang nur über hm_set_hufmanager_manual_access_v1 mit Akteur", () => {
    expect(edge).toMatch(/rpc\(\s*"hm_set_hufmanager_manual_access_v1"/);
    expect(edge).toContain("p_actor_id: callerUser.id");
    expect(edge).not.toMatch(/from\("product_entitlements"\)\s*\.(insert|upsert|update|delete)/);
    expect(edge).not.toMatch(/VERIFIED_PAID/);
  });

  it("setzt kein erfundenes Enddatum (kein 2099-Default mehr)", () => {
    expect(edge).not.toContain("2099");
  });
});
