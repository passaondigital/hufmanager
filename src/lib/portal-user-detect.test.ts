import { describe, expect, it } from "vitest";
import { getPostLoginPath } from "./portal-user-detect";

describe("getPostLoginPath", () => {
  it("routes admins to Mission Control", () => {
    expect(getPostLoginPath("admin", "admin@example.com")).toBe("/admin/mission-control");
  });

  it("keeps provider routing on the HufManager home", () => {
    expect(getPostLoginPath("provider", "provider@example.com")).toBe("/home");
  });

  it("keeps client routing on the client home", () => {
    expect(getPostLoginPath("client", "client@example.com")).toBe("/client-home");
  });
});
