import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MANUAL_GRANT_BY_PLAN,
  PROVIDER_PLAN_OPTIONS,
  isSelectableProviderPlan,
  planRequiresEndDate,
  validateProviderPlanGrant,
  lastValidDayFromExclusiveEnd,
  formatLastValidDay,
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
    expect(validateProviderPlanGrant("lifetime_grant", "2030-01-01", now)).toEqual({ ok: true, lastValidDay: null });
  });

  it("T5/T8 Barzahlung und Beta ohne Enddatum → BLOCK", () => {
    expect(validateProviderPlanGrant("manual_cash_1y", "", now).ok).toBe(false);
    expect(validateProviderPlanGrant("beta_tester", "", now).ok).toBe(false);
  });

  it("letzter Tag: Vergangenheit/> 5 Jahre → BLOCK, heute und Zukunft → exakt als Kalendertag übernommen", () => {
    expect(validateProviderPlanGrant("manual_cash_1y", "2026-09-27", now).ok).toBe(false);
    expect(validateProviderPlanGrant("manual_cash_1y", "2031-09-29", now).ok).toBe(false);
    expect(validateProviderPlanGrant("manual_cash_1y", "2026-09-28", now)).toEqual({ ok: true, lastValidDay: "2026-09-28" });
    expect(validateProviderPlanGrant("beta_tester", "2027-01-15", now)).toEqual({ ok: true, lastValidDay: "2027-01-15" });
  });

  it("„heute“ ist der Berliner Kalendertag (kurz nach Mitternacht lokal, noch Vortag in UTC)", () => {
    const earlyBerlin = new Date("2026-09-28T22:30:00Z"); // 29.09. 00:30 Berlin
    expect(validateProviderPlanGrant("manual_cash_1y", "2026-09-28", earlyBerlin).ok).toBe(false);
    expect(validateProviderPlanGrant("manual_cash_1y", "2026-09-29", earlyBerlin).ok).toBe(true);
  });
});

describe("Anzeige letzter gültiger Tag aus exklusiver Grenze (DB: Folgetag 00:00 Europe/Berlin)", () => {
  it("Winter: Grenze 2027-01-15T23:00Z → 15.01.27", () => {
    expect(lastValidDayFromExclusiveEnd("2027-01-15T23:00:00Z")).toBe("2027-01-15");
    expect(formatLastValidDay("2027-01-15T23:00:00+00:00")).toBe("15.01.27");
  });
  it("Sommer: Grenze 2027-07-15T22:00Z → 15.07.27", () => {
    expect(lastValidDayFromExclusiveEnd("2027-07-15T22:00:00Z")).toBe("2027-07-15");
  });
  it("DST-Wechseltage", () => {
    expect(lastValidDayFromExclusiveEnd("2027-03-27T23:00:00Z")).toBe("2027-03-27");
    expect(lastValidDayFromExclusiveEnd("2027-03-28T22:00:00Z")).toBe("2027-03-28");
    expect(lastValidDayFromExclusiveEnd("2027-10-30T22:00:00Z")).toBe("2027-10-30");
    expect(lastValidDayFromExclusiveEnd("2027-10-31T23:00:00Z")).toBe("2027-10-31");
  });
  it("leer bei fehlendem/ungültigem Wert", () => {
    expect(lastValidDayFromExclusiveEnd(null)).toBe("");
    expect(formatLastValidDay("kaputt")).toBe("");
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

  it("verlangt letzten gültigen Tag für Barzahlung/Beta vor der Anlage und übergibt nur den Kalendertag", () => {
    expect(edge).toContain("p_last_valid_day: grantLastValidDay");
    expect(edge).not.toMatch(/p_valid_until/);
    const check = edge.indexOf("Letzter gültiger Tag (heute bis max. 5 Jahre) ist für Barzahlung/Beta erforderlich");
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
