export const PRODUCT_SPLITTER_MIGRATION_VERSION = "legacy-product-splitter-v1";

export type ProductKey = "HUFMANAGER" | "HUFIAPP";
export type ProductMembershipStatus = "PENDING" | "ACTIVE" | "INACTIVE";
export type BillingClass = "FREE" | "TRIAL" | "VERIFIED_PAID" | "UNKNOWN_BILLING_STATE";
export type TransitionStatus = "DECISION_REQUIRED" | "READY" | "BLOCKED" | "COMPLETED";
export type ProductMembershipResolution =
  | "resolving"
  | "active"
  | "choice_required"
  | "unavailable"
  | "error";

export interface ProductMembership {
  product: ProductKey;
  status: ProductMembershipStatus;
  selected_at: string | null;
  source: string | null;
  migration_version: string | null;
}

export interface LegacyBillingSignals {
  subscription_status?: string | null;
  subscription_plan?: string | null;
  plan_override?: string | null;
  access_valid_until?: string | null;
  copecart_subscription_id?: string | null;
  provider_subscriptions?: Array<{ status?: string | null }> | null;
  client_subscriptions?: Array<{ status?: string | null }> | null;
  manual_payments?: Array<{ status?: string | null }> | null;
}

export interface ProductTransitionPlan {
  currentProduct: ProductKey | "UNKNOWN";
  currentBillingClass: BillingClass;
  targetProduct: ProductKey;
  requiredAction: "NONE" | "DECISION_REQUIRED" | "VERIFY_BILLING" | "PRICING_DECISION_REQUIRED";
  userConfirmationRequired: boolean;
  transitionStatus: TransitionStatus;
}

const VERIFIED_PAYMENT_STATUSES = new Set(["paid", "verified"]);
const VERIFIED_SUBSCRIPTION_STATUSES = new Set(["active", "paid", "verified"]);

export function classifyLegacyBillingState(signals: LegacyBillingSignals): BillingClass {
  const hasCopecartSubscription = Boolean(signals.copecart_subscription_id?.trim());
  const hasProviderSubscription = signals.provider_subscriptions?.some((sub) =>
    VERIFIED_SUBSCRIPTION_STATUSES.has((sub.status || "").toLowerCase()),
  );
  const hasClientSubscription = signals.client_subscriptions?.some((sub) =>
    VERIFIED_SUBSCRIPTION_STATUSES.has((sub.status || "").toLowerCase()),
  );
  const hasManualPayment = signals.manual_payments?.some((payment) =>
    VERIFIED_PAYMENT_STATUSES.has((payment.status || "").toLowerCase()),
  );

  if (hasCopecartSubscription || hasProviderSubscription || hasClientSubscription || hasManualPayment) {
    return "VERIFIED_PAID";
  }

  if (signals.subscription_status === "trialing") {
    return "TRIAL";
  }

  if (signals.subscription_status === "active") {
    return "UNKNOWN_BILLING_STATE";
  }

  if (signals.plan_override && signals.plan_override !== "standard") {
    return "UNKNOWN_BILLING_STATE";
  }

  return "FREE";
}

export function resolveProductMembership(
  memberships: ProductMembership[] | null | undefined,
): { resolution: ProductMembershipResolution; activeProducts: ProductKey[] } {
  if (!memberships) {
    return { resolution: "choice_required", activeProducts: [] };
  }

  const activeProducts = memberships
    .filter((membership) => membership.status === "ACTIVE")
    .map((membership) => membership.product);

  if (activeProducts.length > 0) {
    return { resolution: "active", activeProducts };
  }

  return { resolution: "choice_required", activeProducts: [] };
}

export function canAccessProduct(memberships: ProductMembership[], product: ProductKey): boolean {
  return memberships.some((membership) => membership.product === product && membership.status === "ACTIVE");
}

export function buildProductTransitionPlan(args: {
  currentProduct?: ProductKey | null;
  currentBillingClass: BillingClass;
  targetProduct: ProductKey;
}): ProductTransitionPlan {
  const currentProduct = args.currentProduct ?? "UNKNOWN";

  if (currentProduct === args.targetProduct && args.currentBillingClass !== "UNKNOWN_BILLING_STATE") {
    return {
      currentProduct,
      currentBillingClass: args.currentBillingClass,
      targetProduct: args.targetProduct,
      requiredAction: "NONE",
      userConfirmationRequired: false,
      transitionStatus: "READY",
    };
  }

  return {
    currentProduct,
    currentBillingClass: args.currentBillingClass,
    targetProduct: args.targetProduct,
    requiredAction: args.currentBillingClass === "UNKNOWN_BILLING_STATE" ? "VERIFY_BILLING" : "PRICING_DECISION_REQUIRED",
    userConfirmationRequired: true,
    transitionStatus: "DECISION_REQUIRED",
  };
}

export function assertProductDecisionPreservesIdentity(beforeIds: string[], afterIds: string[]): boolean {
  if (beforeIds.length !== afterIds.length) return false;
  const after = new Set(afterIds);
  return beforeIds.every((id) => after.has(id));
}
