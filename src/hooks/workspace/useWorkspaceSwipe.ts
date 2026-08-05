import { useCallback, useRef } from "react";

export const WORKSPACE_EDGE_PX = 24;
export const WORKSPACE_SWIPE_DISTANCE_PX = 72;
export const WORKSPACE_SWIPE_MAX_VERTICAL_PX = 36;

export function isWorkspaceOpenSwipe(startX: number, startY: number, endX: number, endY: number): boolean {
  return startX <= WORKSPACE_EDGE_PX && endX - startX >= WORKSPACE_SWIPE_DISTANCE_PX && Math.abs(endY - startY) <= WORKSPACE_SWIPE_MAX_VERTICAL_PX;
}

/** A non-primary mouse button (e.g. right-click) never starts a gesture; touch/pen are unaffected. */
export function isPrimaryPointerGesture(pointerType: string, button: number): boolean {
  return !(pointerType === "mouse" && button !== 0);
}

interface SwipePoint { x: number; y: number }
interface PointerDownLike { pointerType: string; button: number; clientX: number; clientY: number }
interface PointerUpLike { clientX: number; clientY: number }

/**
 * Framework-free gesture state machine so the reset/no-stuck-state behavior
 * is testable without rendering a component or a DOM pointer-event stack.
 */
export function createSwipeGestureTracker(onOpen: () => void) {
  let start: SwipePoint | null = null;
  return {
    onPointerDown(event: PointerDownLike) {
      if (!isPrimaryPointerGesture(event.pointerType, event.button)) return;
      start = { x: event.clientX, y: event.clientY };
    },
    onPointerUp(event: PointerUpLike) {
      const gesture = start;
      start = null;
      if (gesture && isWorkspaceOpenSwipe(gesture.x, gesture.y, event.clientX, event.clientY)) onOpen();
    },
    onPointerCancel() {
      start = null;
    },
    hasPendingGesture: () => start !== null,
  };
}

/** Detects only a left-edge gesture and never cancels native scrolling. */
export function useWorkspaceSwipe(onOpen: () => void) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const trackerRef = useRef<ReturnType<typeof createSwipeGestureTracker> | null>(null);
  if (!trackerRef.current) trackerRef.current = createSwipeGestureTracker(() => onOpenRef.current());

  const onPointerDown = useCallback((event: React.PointerEvent) => trackerRef.current?.onPointerDown(event), []);
  const onPointerUp = useCallback((event: React.PointerEvent) => trackerRef.current?.onPointerUp(event), []);
  const onPointerCancel = useCallback(() => trackerRef.current?.onPointerCancel(), []);
  return { onPointerDown, onPointerUp, onPointerCancel };
}
