import { describe, expect, it } from "vitest";
import { slimTrialInfo } from "./slimTrial";

describe("slimTrialInfo", () => {
  const now = new Date("2026-09-28T10:00:00Z");
  it("Tag 1: 14 Tage übrig mit Enddatum", () => {
    expect(slimTrialInfo("ACTIVE_TRIAL", "2026-10-12T10:00:00Z", now)).toEqual({ daysLeft: 14, endDateLabel: "12.10.2026" });
  });
  it("letzter Tag: 1 Tag übrig", () => {
    expect(slimTrialInfo("ACTIVE_TRIAL", "2026-09-28T20:00:00Z", now)?.daysLeft).toBe(1);
  });
  it("Paid/Manual/abgelaufen → kein Trial-Banner", () => {
    expect(slimTrialInfo("ACTIVE_PAID", "2026-10-12T10:00:00Z", now)).toBeNull();
    expect(slimTrialInfo("ACTIVE_MANUAL", null, now)).toBeNull();
    expect(slimTrialInfo("TRIAL_EXPIRED", "2026-09-01T00:00:00Z", now)).toBeNull();
  });
});
