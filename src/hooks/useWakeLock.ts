import { useState, useEffect, useRef, useCallback } from "react";

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [isHeld, setIsHeld] = useState(false);
  const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
      lockRef.current.addEventListener("release", () => setIsHeld(false));
      setIsHeld(true);
    } catch {
      // Permission denied or not supported — silent fail
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (lockRef.current) {
      await lockRef.current.release().catch(() => {});
      lockRef.current = null;
      setIsHeld(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
    return () => { release(); };
  }, [active, acquire, release]);

  // Re-acquire after tab becomes visible again (lock auto-releases on hide)
  useEffect(() => {
    const onVisible = () => {
      if (active && !lockRef.current) acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, acquire]);

  return { isHeld, isSupported };
}
