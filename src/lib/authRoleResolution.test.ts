import { describe, expect, it } from "vitest";
import { resolveTrustedRole } from "./authRoleResolution";

describe("resolveTrustedRole", () => {
  it("accepts valid roles from the trusted user_roles record", () => {
    expect(resolveTrustedRole("provider")).toEqual({ status: "resolved", role: "provider" });
    expect(resolveTrustedRole("client")).toEqual({ status: "resolved", role: "client" });
  });

  it("does not default ROLE_NOT_FOUND to client", () => {
    expect(resolveTrustedRole(null)).toEqual({ status: "not_found", role: null });
    expect(resolveTrustedRole(undefined)).toEqual({ status: "not_found", role: null });
    expect(resolveTrustedRole("")).toEqual({ status: "not_found", role: null });
  });

  it("puts invalid roles into limited/deny resolution", () => {
    expect(resolveTrustedRole("owner")).toEqual({ status: "invalid", role: null });
    expect(resolveTrustedRole({ role: "admin" })).toEqual({ status: "invalid", role: null });
  });

  it("ignores manipulated user_metadata because only the trusted role value is accepted", () => {
    const manipulatedMetadata = { role: "admin" };

    expect(resolveTrustedRole(null)).toEqual({ status: "not_found", role: null });
    expect(manipulatedMetadata.role).toBe("admin");
  });
});

