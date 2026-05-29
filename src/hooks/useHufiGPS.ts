import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GPSState {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;  // Meter
  speedKmh: number | null;
  heading: number | null;   // Grad, null wenn nicht verfügbar
  error: string | null;
  supported: boolean;
  tracking: boolean;
}

interface UseHufiGPSOptions {
  highAccuracy?: boolean;          // default true
  storeInLocalStorage?: boolean;   // schreibt hufi_user_lat / hufi_user_lon
  enabled?: boolean;               // default false — Opt-in
}

type UseHufiGPSReturn = GPSState & {
  startTracking(): void;
  stopTracking(): void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHufiGPS(opts: UseHufiGPSOptions = {}): UseHufiGPSReturn {
  const {
    highAccuracy = true,
    storeInLocalStorage = false,
    enabled = false,
  } = opts;

  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  const [state, setState] = useState<GPSState>({
    lat: null,
    lon: null,
    accuracy: null,
    speedKmh: null,
    heading: null,
    error: null,
    supported,
    tracking: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const activeRef = useRef<boolean>(false);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    activeRef.current = false;
    setState(prev => ({ ...prev, tracking: false }));
  }, []);

  const startTracking = useCallback(() => {
    if (!supported) {
      setState(prev => ({
        ...prev,
        error: "Geolocation wird von diesem Browser nicht unterstützt.",
        tracking: false,
      }));
      return;
    }

    if (activeRef.current) return; // already tracking
    activeRef.current = true;

    setState(prev => ({ ...prev, tracking: true, error: null }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const speedKmh = speed !== null && speed !== undefined ? speed * 3.6 : null;

        if (storeInLocalStorage) {
          localStorage.setItem("hufi_user_lat", String(latitude));
          localStorage.setItem("hufi_user_lon", String(longitude));
        }

        setState(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          accuracy: accuracy ?? null,
          speedKmh,
          heading: heading ?? null,
          error: null,
          tracking: true,
        }));
      },
      (err) => {
        let message: string;
        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            message = "GPS-Zugriff verweigert.";
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            message = "Position nicht verfügbar.";
            break;
          case GeolocationPositionError.TIMEOUT:
            message = "GPS-Zeitüberschreitung.";
            break;
          default:
            message = "GPS-Fehler.";
        }
        console.warn("[useHufiGPS] Geolocation error:", message);
        setState(prev => ({ ...prev, error: message, tracking: false }));
        activeRef.current = false;
        watchIdRef.current = null;
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  }, [supported, highAccuracy, storeInLocalStorage]);

  // Auto-start if enabled=true
  useEffect(() => {
    if (enabled) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
