/**
 * Real User Monitoring (RUM) — Core Web Vitals
 * Measures LCP, FID, CLS, TTFB and reports to performance_metrics table.
 */

import { supabase } from "@/integrations/supabase/client";

interface MetricEntry {
  metric_type: string;
  value_ms: number;
  route: string;
  metadata: { connection_type: string; device_memory: number | null; user_agent: string };
}

let metricsBuffer: MetricEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getConnectionType(): string {
  const nav = navigator as any;
  return nav.connection?.effectiveType || "unknown";
}

function getDeviceMemory(): number | null {
  return (navigator as any).deviceMemory ?? null;
}

function bufferMetric(name: string, value: number) {
  metricsBuffer.push({
    metric_type: name,
    value_ms: Math.round(value * 100) / 100,
    route: window.location.pathname,
    metadata: {
      connection_type: getConnectionType(),
      device_memory: getDeviceMemory(),
      user_agent: navigator.userAgent.slice(0, 200),
    },
  });

  // Flush every 10s or when buffer has 10+ entries
  if (!flushTimer) {
    flushTimer = setTimeout(flushMetrics, 10_000);
  }
  if (metricsBuffer.length >= 10) {
    flushMetrics();
  }
}

async function flushMetrics() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (metricsBuffer.length === 0) return;

  const batch = [...metricsBuffer];
  metricsBuffer = [];

  try {
    // Only send metrics if user is authenticated (RLS requires auth)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("performance_metrics").insert(batch);
  } catch {
    // Silent fail — don't break UX for monitoring
  }
}

/**
 * Start measuring Core Web Vitals via PerformanceObserver.
 * Call once in main.tsx.
 */
export function measurePerformance() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  // LCP
  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) bufferMetric("LCP", last.startTime);
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  // FID (First Input Delay)
  try {
    const fidObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        bufferMetric("FID", entry.processingStart - entry.startTime);
      }
    });
    fidObs.observe({ type: "first-input", buffered: true });
  } catch {}

  // CLS
  try {
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      bufferMetric("CLS", clsValue * 1000); // scale for storage
    });
    clsObs.observe({ type: "layout-shift", buffered: true });
  } catch {}

  // Navigation Timing (TTFB)
  try {
    const navObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceNavigationTiming[]) {
        bufferMetric("TTFB", entry.responseStart - entry.requestStart);
        bufferMetric("FCP", entry.domContentLoadedEventEnd - entry.startTime);
      }
    });
    navObs.observe({ type: "navigation", buffered: true });
  } catch {}

  // Flush on page hide
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushMetrics();
    }
  });
}
