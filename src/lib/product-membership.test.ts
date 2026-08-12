import { describe, expect, it } from "vitest";
import {
  assertProductDecisionPreservesIdentity,
  buildProductTransitionPlan,
  canAccessProduct,
  classifyLegacyBillingState,
  resolveProductMembership,
} from "./product-membership";

describe("product membership splitter", () => {
  it("requires product choice when no active membership exists", () => {
    expect(resolveProductMembership([])).toEqual({ resolution: "choice_required", activeProducts: [] });
  });

  it("does not grant one product through another product membership", () => {
    const memberships = [{ product: "HUFMANAGER" as const, status: "ACTIVE" as const, selected_at: null, source: null, migration_version: null }];

    expect(canAccessProduct(memberships, "HUFMANAGER")).toBe(true);
    expect(canAccessProduct(memberships, "HUFIAPP")).toBe(false);
  });

  it("does not treat active or trialing profile state alone as verified paid", () => {
    expect(classifyLegacyBillingState({ subscription_status: "active" })).toBe("UNKNOWN_BILLING_STATE");
    expect(classifyLegacyBillingState({ subscription_status: "trialing" })).toBe("TRIAL");
  });

  it("requires verified external billing evidence for verified paid", () => {
    expect(classifyLegacyBillingState({ copecart_subscription_id: "sub_123" })).toBe("VERIFIED_PAID");
    expect(classifyLegacyBillingState({ manual_payments: [{ status: "verified" }] })).toBe("VERIFIED_PAID");
  });

  it("keeps pricing transition as decision required", () => {
    expect(
      buildProductTransitionPlan({
        currentProduct: "HUFMANAGER",
        currentBillingClass: "UNKNOWN_BILLING_STATE",
        targetProduct: "HUFIAPP",
      }),
    ).toMatchObject({
      requiredAction: "VERIFY_BILLING",
      userConfirmationRequired: true,
      transitionStatus: "DECISION_REQUIRED",
    });
  });

  it("preserves existing canonical ids across product choice", () => {
    expect(assertProductDecisionPreservesIdentity(["pid-1", "eqid-1"], ["eqid-1", "pid-1"])).toBe(true);
    expect(assertProductDecisionPreservesIdentity(["pid-1", "eqid-1"], ["pid-1"])).toBe(false);
  });
});
