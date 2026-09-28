// Kanonische Konto-Klassifizierung (profiles.account_class, Migration 20260929110000).
// Business-Kennzahlen zählen ausschließlich account_class = "real". Die Klasse gewährt oder entzieht
// keinen Zugang – das bleibt product_entitlements.

import { normalizeToMonthlyMRR } from "@/lib/plan-features";

export type AccountClass = "real" | "demo" | "qa" | "test_fixture";

export const ACCOUNT_CLASS_LABELS: Record<AccountClass, string> = {
  real: "Echtkunde",
  qa: "QA/Test",
  demo: "Demo",
  test_fixture: "Test-Fixture",
};

export type AccountClassFilter = AccountClass | "all";

export const ACCOUNT_CLASS_FILTER_OPTIONS: { value: AccountClassFilter; label: string }[] = [
  { value: "real", label: "Echtkunden" },
  { value: "qa", label: "QA" },
  { value: "demo", label: "Demo" },
  { value: "test_fixture", label: "Test-Fixtures" },
  { value: "all", label: "Alle" },
];

/** Bei Neuanlage wählbar; Demo/Test-Fixture nur über gezielte Admin-Pflege. */
export const CREATE_ACCOUNT_CLASS_OPTIONS: { value: "real" | "qa"; label: string }[] = [
  { value: "real", label: "Echtkunde" },
  { value: "qa", label: "QA/Test (zählt nicht in Statistiken)" },
];

/** Fehlender Wert (alte Daten ohne Spalte) wird wie real behandelt – nie stillschweigend ausgeblendet. */
export function accountClassOf(p: { account_class?: string | null }): AccountClass {
  const c = p.account_class;
  return c === "demo" || c === "qa" || c === "test_fixture" ? c : "real";
}

export function isBusinessAccount(p: { account_class?: string | null }): boolean {
  return accountClassOf(p) === "real";
}

export function matchesAccountClassFilter(p: { account_class?: string | null }, filter: AccountClassFilter): boolean {
  return filter === "all" || accountClassOf(p) === filter;
}

/** Nur Hinweis in der Anlage-Maske („sieht wie QA aus – als QA markieren?“), nie kanonische Entscheidung. */
export function looksLikeQaEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return /\+qa/.test(e) || e.endsWith("@test.com") || e.endsWith("@example.test") || e.endsWith("@example.com");
}

export interface KpiProviderProfile {
  id: string;
  account_class?: string | null;
  is_suspended?: boolean | null;
  plan_override?: string | null;
  subscription_status?: string | null;
  access_valid_until?: string | null;
  created_at: string;
}

export interface KpiPayment {
  amount: number | null;
  provider_id: string;
  period_start: string | null;
  period_end: string | null;
}

export interface ProviderKpis {
  totalProviders: number;
  activeProviders: number;
  lifetimeUsers: number;
  suspendedUsers: number;
  newThisWeek: number;
  newLastWeek: number;
  churned: number;
  churnRate: number;
  mrrCents: number;
  payingProviders: number;
  nonBusinessProviders: Record<Exclude<AccountClass, "real">, number>;
}

/** Provider-/Umsatz-KPIs – nur account_class = real; Aktiv-/Churn-Regeln unverändert zur bisherigen Logik. */
export function computeProviderKpis(profiles: KpiProviderProfile[], payments: KpiPayment[], now: Date = new Date()): ProviderKpis {
  const real = profiles.filter(isBusinessAccount);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);

  const active = real.filter((p) => {
    if (p.is_suspended) return false;
    if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") return true;
    if (p.access_valid_until) return new Date(p.access_valid_until) > now;
    return p.subscription_status === "active";
  });
  const churned = real.filter((p) => {
    if (p.is_suspended || p.plan_override === "lifetime_grant" || p.plan_override === "employee") return false;
    if (p.access_valid_until) {
      const d = new Date(p.access_valid_until);
      return d < now && d >= oneMonthAgo;
    }
    return false;
  }).length;

  // MRR nur aus Zahlungen echter, nicht-lifetime/employee Provider.
  const mrrEligible = new Set(
    real.filter((p) => p.plan_override !== "lifetime_grant" && p.plan_override !== "employee").map((p) => p.id),
  );
  const realPayments = payments.filter((p) => mrrEligible.has(p.provider_id));
  const mrrCents = realPayments.reduce(
    (s, p) => s + normalizeToMonthlyMRR(p.amount || 0, p.period_start ?? null, p.period_end ?? null),
    0,
  );

  const nonBusinessProviders = { demo: 0, qa: 0, test_fixture: 0 };
  for (const p of profiles) {
    const c = accountClassOf(p);
    if (c !== "real") nonBusinessProviders[c] += 1;
  }

  return {
    totalProviders: real.length,
    activeProviders: active.length,
    lifetimeUsers: real.filter((p) => p.plan_override === "lifetime_grant").length,
    suspendedUsers: real.filter((p) => p.is_suspended).length,
    newThisWeek: real.filter((p) => new Date(p.created_at) >= oneWeekAgo).length,
    newLastWeek: real.filter((p) => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo).length,
    churned,
    churnRate: active.length > 0 ? (churned / active.length) * 100 : 0,
    mrrCents,
    payingProviders: new Set(realPayments.map((p) => p.provider_id)).size,
    nonBusinessProviders,
  };
}
