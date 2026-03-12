import { useState, useEffect, useRef } from "react";

export function useAnimatedCounter(target: number, duration = 600, enabled = true): number {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || hasAnimated.current || target === 0) {
      setValue(target);
      return;
    }

    hasAnimated.current = true;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration, enabled]);

  return value;
}
