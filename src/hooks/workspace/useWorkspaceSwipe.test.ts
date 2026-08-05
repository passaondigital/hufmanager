import { describe, expect, it, vi } from "vitest";
import { createSwipeGestureTracker, isPrimaryPointerGesture, isWorkspaceOpenSwipe } from "./useWorkspaceSwipe";

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

describe("isPrimaryPointerGesture", () => {
  it("accepts touch/pen regardless of the button value", () => {
    expect(isPrimaryPointerGesture("touch", 0)).toBe(true);
    expect(isPrimaryPointerGesture("pen", 2)).toBe(true);
  });
  it("accepts only the primary mouse button", () => {
    expect(isPrimaryPointerGesture("mouse", 0)).toBe(true);
    expect(isPrimaryPointerGesture("mouse", 1)).toBe(false);
    expect(isPrimaryPointerGesture("mouse", 2)).toBe(false);
  });
});

describe("createSwipeGestureTracker", () => {
  it("opens on a valid right-swipe starting inside the edge zone", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 10, clientY: 200 });
    tracker.onPointerUp({ clientX: 90, clientY: 205 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not open when the gesture starts outside the edge zone", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 40, clientY: 200 });
    tracker.onPointerUp({ clientX: 130, clientY: 205 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open for a swipe that is too short", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 10, clientY: 200 });
    tracker.onPointerUp({ clientX: 40, clientY: 202 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open for a mostly-vertical movement", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 10, clientY: 200 });
    tracker.onPointerUp({ clientX: 90, clientY: 320 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("clears pending state on pointercancel without opening", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 10, clientY: 200 });
    expect(tracker.hasPendingGesture()).toBe(true);
    tracker.onPointerCancel();
    expect(tracker.hasPendingGesture()).toBe(false);
    tracker.onPointerUp({ clientX: 90, clientY: 205 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("ignores a non-primary mouse button and never starts a pending gesture", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);
    tracker.onPointerDown({ pointerType: "mouse", button: 2, clientX: 10, clientY: 200 });
    expect(tracker.hasPendingGesture()).toBe(false);
    tracker.onPointerUp({ clientX: 90, clientY: 205 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("never gets stuck across repeated gestures", () => {
    const onOpen = vi.fn();
    const tracker = createSwipeGestureTracker(onOpen);

    // First gesture opens.
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 10, clientY: 200 });
    tracker.onPointerUp({ clientX: 90, clientY: 205 });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(tracker.hasPendingGesture()).toBe(false);

    // A short/failed gesture in between must not leave state dangling.
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 12, clientY: 400 });
    tracker.onPointerUp({ clientX: 30, clientY: 402 });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(tracker.hasPendingGesture()).toBe(false);

    // A pointerup with no preceding pointerdown (stray event) must be a no-op.
    tracker.onPointerUp({ clientX: 90, clientY: 205 });
    expect(onOpen).toHaveBeenCalledTimes(1);

    // A subsequent valid gesture still opens correctly.
    tracker.onPointerDown({ pointerType: "touch", button: 0, clientX: 5, clientY: 600 });
    tracker.onPointerUp({ clientX: 100, clientY: 610 });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
