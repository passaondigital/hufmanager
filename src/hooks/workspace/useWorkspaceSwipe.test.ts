import { describe, expect, it } from "vitest";
import { isWorkspaceOpenSwipe } from "./useWorkspaceSwipe";

describe("isWorkspaceOpenSwipe", () => {
  it("opens only for a sufficiently long right swipe from the left edge", () => {
    expect(isWorkspaceOpenSwipe(12, 100, 90, 110)).toBe(true);
  });
  it("rejects gestures away from the edge, short swipes, and vertical gestures", () => {
    expect(isWorkspaceOpenSwipe(25, 100, 120, 105)).toBe(false);
    expect(isWorkspaceOpenSwipe(8, 100, 70, 105)).toBe(false);
    expect(isWorkspaceOpenSwipe(8, 100, 100, 140)).toBe(false);
  });
});
