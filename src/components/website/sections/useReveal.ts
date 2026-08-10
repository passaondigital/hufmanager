import { useEffect, useRef, useState } from "react";

/**
 * Scroll-Reveal mit Sicherheitsnetz: Inhalte duerfen nie dauerhaft
 * unsichtbar bleiben, falls IntersectionObserver aus irgendeinem Grund
 * nicht feuert (Crawler, sehr schnelles Scrollen, Timing-Kanten). Nach
 * `maxDelayMs` wird sichtbar erzwungen, unabhaengig vom Observer.
 */
export function useReveal(threshold = 0.12, maxDelayMs = 900) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "80px 0px" }
    );
    obs.observe(el);
    const fallback = window.setTimeout(() => setVisible(true), maxDelayMs);
    return () => { obs.disconnect(); window.clearTimeout(fallback); };
  }, [threshold, maxDelayMs]);
  return { ref, visible };
}

export const revealClass = (visible: boolean, extra = "") =>
  `transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${extra}`;
