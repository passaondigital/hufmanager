import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  accountClassOf,
  computeProviderKpis,
  isBusinessAccount,
  looksLikeQaEmail,
  matchesAccountClassFilter,
  type KpiPayment,
  type KpiProviderProfile,
} from "./accountClass";

const NOW = new Date("2026-09-28T20:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
const inDays = (d: number) => new Date(NOW.getTime() + d * 86400000).toISOString();

const P = (id: string, cls: string, extra: Partial<KpiProviderProfile> = {}): KpiProviderProfile => ({
  id, account_class: cls, is_suspended: false, plan_override: null, subscription_status: "active",
  access_valid_until: null, created_at: daysAgo(60), ...extra,
});

const profiles: KpiProviderProfile[] = [
  P("real-old", "real"),
  P("real-new", "real", { created_at: daysAgo(2) }),
  P("real-lifetime", "real", { plan_override: "lifetime_grant", subscription_status: null }),
  P("real-churned", "real", { access_valid_until: daysAgo(5), subscription_status: null }),
  P("qa-new", "qa", { created_at: daysAgo(1) }),
  P("demo-lifetime", "demo", { plan_override: "lifetime_grant" }),
  P("fixture", "test_fixture", { created_at: daysAgo(3) }),
  P("qa-churned", "qa", { access_valid_until: daysAgo(3), subscription_status: null }),
];
const pay = (provider_id: string, amount = 1995): KpiPayment => ({
  provider_id, amount, period_start: daysAgo(10).slice(0, 10), period_end: inDays(20).slice(0, 10),
});
const payments = [pay("real-old"), pay("qa-new"), pay("demo-lifetime"), pay("fixture"), pay("real-lifetime")];
const k = computeProviderKpis(profiles, payments, NOW);

describe("account_class – Business-KPIs zählen nur real", () => {
  it("T1–T4 Provider gesamt: real ja, qa/demo/test_fixture nein", () => {
    expect(k.totalProviders).toBe(4);
    expect(k.nonBusinessProviders).toEqual({ qa: 2, demo: 1, test_fixture: 1 });
  });
  it("T5/T6 neu diese Woche: real ja, qa/test_fixture nein", () => {
    expect(k.newThisWeek).toBe(1);
  });
  it("T7 MRR/zahlende Provider nur real (ohne Lifetime)", () => {
    const only = computeProviderKpis(profiles, [pay("real-old")], NOW);
    expect(k.mrrCents).toBe(only.mrrCents);
    expect(k.mrrCents).toBeGreaterThan(0);
    expect(k.payingProviders).toBe(1);
  });
  it("T8 Lifetime nur real – Demo-Lifetime zählt nicht (T19)", () => {
    expect(k.lifetimeUsers).toBe(1);
  });
  it("T9 Churn nur real", () => {
    expect(k.churned).toBe(1);
  });
  it("aktive Provider nur real (Regeln unverändert)", () => {
    expect(k.activeProviders).toBe(3); // old (active), new (active), lifetime
  });
});

describe("account_class – Provider-Liste/Filter", () => {
  const list = profiles.map((p) => ({ account_class: p.account_class, id: p.id }));
  it("T10 Standard-Filter = nur real", () => {
    expect(list.filter((p) => matchesAccountClassFilter(p, "real")).map((p) => p.id))
      .toEqual(["real-old", "real-new", "real-lifetime", "real-churned"]);
  });
  it("T11 Filter QA zeigt QA", () => {
    expect(list.filter((p) => matchesAccountClassFilter(p, "qa")).map((p) => p.id)).toEqual(["qa-new", "qa-churned"]);
  });
  it("T12 Filter Alle zeigt alle", () => {
    expect(list.filter((p) => matchesAccountClassFilter(p, "all"))).toHaveLength(profiles.length);
  });
  it("fehlender/unbekannter Wert wird nie stillschweigend ausgeblendet (→ real)", () => {
    expect(accountClassOf({})).toBe("real");
    expect(accountClassOf({ account_class: "intern" })).toBe("real");
    expect(isBusinessAccount({ account_class: "qa" })).toBe(false);
  });
  it("E-Mail-Muster ist nur Hinweis", () => {
    expect(looksLikeQaEmail("x+qa-std@gmail.com")).toBe(true);
    expect(looksLikeQaEmail("provider@test.com")).toBe(true);
    expect(looksLikeQaEmail("kunde@gmail.com")).toBe(false);
  });
});

describe("account_class – Neuanlage (admin-create-user + Mission Control)", () => {
  const edge = readFileSync(join(process.cwd(), "supabase/functions/admin-create-user/index.ts"), "utf8");
  const tab = readFileSync(join(process.cwd(), "src/components/admin/AdminProviderTab.tsx"), "utf8");
  it("T16 ohne Angabe → real; T15 qa erlaubt; alles andere 400 vor der Anlage", () => {
    expect(edge).toMatch(/accountClass == null \|\| accountClass === "" \? "real" : accountClass/);
    expect(edge).toMatch(/resolvedAccountClass !== "real" && resolvedAccountClass !== "qa"/);
    expect(edge).toMatch(/account_class: resolvedAccountClass/);
    expect(edge.indexOf("resolvedAccountClass !==")).toBeLessThan(edge.indexOf("auth.admin.createUser"));
  });
  it("Mission Control sendet die gewählte Kontoart, Default Echtkunde", () => {
    expect(tab).toMatch(/useState<"real" \| "qa">\("real"\)/);
    expect(tab).toMatch(/accountClass: newUserAccountClass/);
  });
});
