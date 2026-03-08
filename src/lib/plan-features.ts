/**
 * Shared PLAN_FEATURE_MAP – identical to copecart-webhook.
 * Used for manual plan changes in AdminUserDB.
 */
export const PLAN_FEATURE_MAP: Record<string, Record<string, string>> = {
  starter: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "disabled",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "disabled",
    autoflow_reminders: "disabled",
    autoflow_invoicing: "disabled",
    autoflow_scheduling: "disabled",
    autoflow_feedback: "disabled",
    autoflow_checkin: "disabled",
    beta_features: "disabled",
    widget_embed: "public",
    widget_custom_style: "disabled",
    widget_white_label: "disabled",
    custom_domain_addon: "disabled",
    affiliate_program: "disabled",
    cooperation_visibility: "disabled",
    education_certificates: "public",
  },
  pro: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "disabled",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "disabled",
    widget_embed: "public",
    widget_custom_style: "public",
    widget_white_label: "disabled",
    custom_domain_addon: "public",
    affiliate_program: "public",
    cooperation_visibility: "public",
    education_certificates: "public",
  },
  duo: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "public",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "disabled",
    widget_embed: "public",
    widget_custom_style: "public",
    widget_white_label: "disabled",
    custom_domain_addon: "public",
    affiliate_program: "public",
    cooperation_visibility: "public",
    education_certificates: "public",
  },
  team: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "public",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "public",
    widget_embed: "public",
    widget_custom_style: "public",
    widget_white_label: "public",
    custom_domain_addon: "public",
    affiliate_program: "public",
    cooperation_visibility: "public",
    education_certificates: "public",
  },
};

/** Preview link limits per plan */
export const PREVIEW_LINK_LIMITS: Record<string, { maxLinks: number; maxDays: number; feedbackEnabled: boolean }> = {
  starter: { maxLinks: 1, maxDays: 7, feedbackEnabled: false },
  pro: { maxLinks: 5, maxDays: 30, feedbackEnabled: true },
  duo: { maxLinks: 10, maxDays: 30, feedbackEnabled: true },
  team: { maxLinks: 999, maxDays: 999, feedbackEnabled: true },
};

/**
 * Normalize a payment amount to monthly MRR.
 * If the period spans > 60 days, divide by the number of months.
 */
export function normalizeToMonthlyMRR(amount: number, periodStart: string | null, periodEnd: string | null): number {
  if (!periodStart || !periodEnd) return amount;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 60) {
    const months = Math.max(1, Math.round(diffDays / 30));
    return Math.round((amount / months) * 100) / 100;
  }
  return amount;
}
