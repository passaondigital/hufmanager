// Owner-Matrix 28.09.2026 (docs/billing/OVERRIDE_ENTITLEMENTS_AUDIT_2026-09-28.md):
// Neue Provider bekommen entweder den Standard-Slim-Trial oder einen Owner-Grant über den
// kanonischen Manual-Access-Writer (hm_set_hufmanager_manual_access_v1). Legacy-CopeCart-Pläne
// (Planstring ist kein Zahlungsbeweis) und „employee“ (Mitarbeiter laufen über die
// Mitarbeiter-Einladung) werden nicht mehr angeboten.

export type ManualGrantType = "MANUAL_LIFETIME" | "MANUAL_FIXED_TERM" | "BETA_ACCESS";

export const PROVIDER_PLAN_OPTIONS = [
  { value: "standard", label: "HufManager Slim – 14 Tage testen, danach 19,95 €/Monat" },
  { value: "lifetime_grant", label: "Lifetime – manueller Dauerzugang" },
  { value: "manual_cash_1y", label: "Barzahlung / manueller Zugang – Enddatum erforderlich" },
  { value: "beta_tester", label: "Beta – kostenlos bis Enddatum" },
] as const;

export const MANUAL_GRANT_BY_PLAN: Record<string, ManualGrantType> = {
  lifetime_grant: "MANUAL_LIFETIME",
  manual_cash_1y: "MANUAL_FIXED_TERM",
  beta_tester: "BETA_ACCESS",
};

export function isSelectableProviderPlan(plan: string): boolean {
  return PROVIDER_PLAN_OPTIONS.some((o) => o.value === plan);
}

export function planRequiresEndDate(plan: string): boolean {
  const grant = MANUAL_GRANT_BY_PLAN[plan];
  return grant === "MANUAL_FIXED_TERM" || grant === "BETA_ACCESS";
}

// Enddatum als ISO-Zeitpunkt, genau so, wie admin-create-user es an den Writer gibt
// (new Date("YYYY-MM-DD") = 00:00 UTC). null = kein Enddatum (Standard/Lifetime).
export function validateProviderPlanGrant(
  plan: string,
  endDate: string,
  now: Date = new Date(),
): { ok: true; validUntil: string | null } | { ok: false; error: string } {
  if (!isSelectableProviderPlan(plan)) {
    return { ok: false, error: "Dieser Plan ist nicht mehr auswählbar" };
  }
  if (!planRequiresEndDate(plan)) {
    return { ok: true, validUntil: null };
  }
  const end = endDate ? new Date(endDate) : null;
  if (!end || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Enddatum ist für diesen Zugang erforderlich" };
  }
  if (end.getTime() <= now.getTime()) {
    return { ok: false, error: "Enddatum muss in der Zukunft liegen" };
  }
  return { ok: true, validUntil: end.toISOString() };
}
