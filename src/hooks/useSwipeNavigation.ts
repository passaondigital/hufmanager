import { useRef, useCallback } from "react";

interface UseSwipeNavigationOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
}

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeNavigationOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const dx = touchStart.current.x - touchEnd.current.x;
    const dy = Math.abs(touchStart.current.y - touchEnd.current.y);

    // Only trigger if horizontal swipe is dominant (not vertical scroll)
    if (Math.abs(dx) > threshold && Math.abs(dx) > dy * 1.5) {
      if (dx > 0) {
        onSwipeLeft(); // swiped left → next
      } else {
        onSwipeRight(); // swiped right → prev
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
