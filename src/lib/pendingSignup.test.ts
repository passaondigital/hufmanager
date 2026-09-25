import { beforeEach, describe, expect, it, vi } from "vitest";
import { restorePendingSignup, savePendingSignup } from "@/lib/pendingSignup";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

let session: MemoryStorage;
let local: MemoryStorage;

beforeEach(() => {
  session = new MemoryStorage();
  local = new MemoryStorage();
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("localStorage", local);
  vi.useRealTimers();
});

function signupInTabA(email: string) {
  session.setItem("hm_pending_profession_type", "hoof_care");
  session.setItem("hm_pending_widerruf_consent", "2026-09-25T08:00:00.000Z");
  session.setItem("huf_invite_code", "HM-123");
  savePendingSignup(email);
  // Bestätigungslink öffnet neuen Tab: sessionStorage leer
  session = new MemoryStorage();
  vi.stubGlobal("sessionStorage", session);
}

describe("pendingSignup", () => {
  it("restores values in a new tab for the same email (case-insensitive)", () => {
    signupInTabA("Neu@Example.de");
    restorePendingSignup("neu@example.de");
    expect(session.getItem("hm_pending_profession_type")).toBe("hoof_care");
    expect(session.getItem("hm_pending_widerruf_consent")).toBe("2026-09-25T08:00:00.000Z");
    expect(session.getItem("huf_invite_code")).toBe("HM-123");
    expect(local.getItem("hm_pending_signup_v1")).toBeNull();
  });

  it("never hands values to a different user on the same device", () => {
    signupInTabA("a@example.de");
    restorePendingSignup("b@example.de");
    expect(session.getItem("huf_invite_code")).toBeNull();
    expect(session.getItem("hm_pending_widerruf_consent")).toBeNull();
    expect(local.getItem("hm_pending_signup_v1")).not.toBeNull();
  });

  it("drops the copy after 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T08:00:00Z"));
    signupInTabA("a@example.de");
    vi.setSystemTime(new Date("2026-10-03T08:00:00Z"));
    restorePendingSignup("a@example.de");
    expect(session.getItem("hm_pending_profession_type")).toBeNull();
    expect(local.getItem("hm_pending_signup_v1")).toBeNull();
  });

  it("does not overwrite values already present in the tab and is consumed once", () => {
    signupInTabA("a@example.de");
    session.setItem("hm_pending_profession_type", "osteopathy");
    restorePendingSignup("a@example.de");
    expect(session.getItem("hm_pending_profession_type")).toBe("osteopathy");
    session.clear();
    restorePendingSignup("a@example.de");
    expect(session.getItem("hm_pending_widerruf_consent")).toBeNull();
  });

  it("ignores corrupt data and saves nothing without pending values", () => {
    local.setItem("hm_pending_signup_v1", "{kaputt");
    restorePendingSignup("a@example.de");
    expect(local.getItem("hm_pending_signup_v1")).toBeNull();
    savePendingSignup("a@example.de");
    expect(local.getItem("hm_pending_signup_v1")).toBeNull();
  });
});
