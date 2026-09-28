// Trial-Anzeige aus dem kanonischen Access-Context (get_hufmanager_access_context_v1 → trial_ends_at).
export interface SlimTrialInfo {
  daysLeft: number;
  endDateLabel: string;
}

export function slimTrialInfo(reasonCode: string | null | undefined, trialEndsAt: string | null | undefined, now: Date = new Date()): SlimTrialInfo | null {
  if (reasonCode !== "ACTIVE_TRIAL" || !trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  const endDateLabel = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(end);
  return { daysLeft, endDateLabel };
}
