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

// Enddatum = LETZTER gültiger Nutzungstag (inklusiv, Owner-Regel 28.09.2026). Übergeben wird nur der
// Kalendertag "YYYY-MM-DD"; die technische Grenze (Folgetag 00:00 Europe/Berlin, DST-sicher) berechnet die DB
// (hm_manual_access_exclusive_end_v1) und speichert sie als current_period_end / access_valid_until.
export const ACCESS_TIME_ZONE = "Europe/Berlin";

function berlinDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ACCESS_TIME_ZONE }).format(d);
}

export function validateProviderPlanGrant(
  plan: string,
  lastValidDay: string,
  now: Date = new Date(),
): { ok: true; lastValidDay: string | null } | { ok: false; error: string } {
  if (!isSelectableProviderPlan(plan)) {
    return { ok: false, error: "Dieser Plan ist nicht mehr auswählbar" };
  }
  if (!planRequiresEndDate(plan)) {
    return { ok: true, lastValidDay: null };
  }
  const day = (lastValidDay || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { ok: false, error: "Letzter gültiger Tag ist für diesen Zugang erforderlich" };
  }
  const today = berlinDay(now);
  if (day < today) {
    return { ok: false, error: "Letzter gültiger Tag darf nicht in der Vergangenheit liegen" };
  }
  const maxDay = `${Number(today.slice(0, 4)) + 5}${today.slice(4)}`;
  if (day > maxDay) {
    return { ok: false, error: "Letzter gültiger Tag höchstens 5 Jahre in der Zukunft" };
  }
  return { ok: true, lastValidDay: day };
}

// Anzeige: exklusive Grenze (z. B. 16.01.2027 00:00 Berlin) → letzter gültiger Tag "2027-01-15".
export function lastValidDayFromExclusiveEnd(exclusiveEnd: string | null | undefined): string {
  if (!exclusiveEnd) return "";
  const t = new Date(exclusiveEnd).getTime();
  if (Number.isNaN(t)) return "";
  return berlinDay(new Date(t - 1));
}

export function formatLastValidDay(exclusiveEnd: string | null | undefined): string {
  const day = lastValidDayFromExclusiveEnd(exclusiveEnd);
  return day ? `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(2, 4)}` : "";
}

// supabase.functions.invoke liefert bei 4xx/5xx nur "Edge Function returned a non-2xx status code".
// Die eigentliche Fehlermeldung der Function steht im Response-Body ({ error }) → sichtbar machen.
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx && typeof (ctx as Response).clone === "function") {
    try {
      const body = await (ctx as Response).clone().json();
      if (body && typeof body.error === "string" && body.error) {
        const status = (ctx as Response).status;
        return status ? `${body.error} (HTTP ${status})` : body.error;
      }
    } catch {
      // kein JSON-Body → Standardmeldung unten
    }
  }
  const msg = (error as { message?: unknown })?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}
