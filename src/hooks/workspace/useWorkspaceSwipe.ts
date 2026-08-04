import { useCallback, useRef } from "react";

export const WORKSPACE_EDGE_PX = 24;
export const WORKSPACE_SWIPE_DISTANCE_PX = 72;
export const WORKSPACE_SWIPE_MAX_VERTICAL_PX = 36;

export function isWorkspaceOpenSwipe(startX: number, startY: number, endX: number, endY: number): boolean {
  return startX <= WORKSPACE_EDGE_PX && endX - startX >= WORKSPACE_SWIPE_DISTANCE_PX && Math.abs(endY - startY) <= WORKSPACE_SWIPE_MAX_VERTICAL_PX;
}

/** Detects only a left-edge gesture and never cancels native scrolling. */
export function useWorkspaceSwipe(onOpen: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY };
  }, []);
  const onPointerUp = useCallback((event: React.PointerEvent) => {
    const gesture = start.current;
    start.current = null;
    if (gesture && isWorkspaceOpenSwipe(gesture.x, gesture.y, event.clientX, event.clientY)) onOpen();
  }, [onOpen]);
  const onPointerCancel = useCallback(() => { start.current = null; }, []);
  return { onPointerDown, onPointerUp, onPointerCancel };
}
