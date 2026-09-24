import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, role: null }) }));

import {
  clearSlimAccessCache,
  readCachedSlimAccess,
  writeCachedSlimAccess,
  type HufmanagerSlimAccessContext,
} from "@/hooks/useHufmanagerSlimAccess";

const active: HufmanagerSlimAccessContext = {
  hasAccess: true,
  entitlementStatus: "TRIAL_ACTIVE",
  billingStatus: null,
  trialStatus: "ACTIVE",
  trialEndsAt: "2026-10-08T00:00:00Z",
  currentPeriodEnd: null,
  reasonCode: "ACTIVE_TRIAL",
};

describe("slim access cache (tab switch must not block on the RPC again)", () => {
  beforeEach(() => clearSlimAccessCache());

  it("reports unknown users as undefined so the gate blocks exactly once", () => {
    expect(readCachedSlimAccess("user-a")).toBeUndefined();
    expect(readCachedSlimAccess(undefined)).toBeUndefined();
  });

  it("returns the stored answer for the same user", () => {
    writeCachedSlimAccess("user-a", active);
    expect(readCachedSlimAccess("user-a")).toEqual(active);
  });

  it("keeps a null answer distinct from 'unknown'", () => {
    writeCachedSlimAccess("user-a", null);
    expect(readCachedSlimAccess("user-a")).toBeNull();
  });

  it("never hands one user's answer to another user", () => {
    writeCachedSlimAccess("user-a", active);
    expect(readCachedSlimAccess("user-b")).toBeUndefined();
  });

  it("forgets everything on clear", () => {
    writeCachedSlimAccess("user-a", active);
    clearSlimAccessCache();
    expect(readCachedSlimAccess("user-a")).toBeUndefined();
  });
});
