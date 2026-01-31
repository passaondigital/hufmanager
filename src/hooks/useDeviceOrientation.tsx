import { useState, useEffect, useCallback } from "react";

interface OrientationState {
  alpha: number | null; // rotation around z-axis (0-360)
  beta: number | null;  // rotation around x-axis (-180 to 180)
  gamma: number | null; // rotation around y-axis (-90 to 90)
  isLevel: boolean;
  tiltAngle: number;
  hasPermission: boolean;
  isSupported: boolean;
}

const LEVEL_THRESHOLD = 5; // degrees

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<OrientationState>({
    alpha: null,
    beta: null,
    gamma: null,
    isLevel: true,
    tiltAngle: 0,
    hasPermission: false,
    isSupported: typeof window !== "undefined" && "DeviceOrientationEvent" in window,
  });

  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== "undefined" && 
        typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          setOrientation(prev => ({ ...prev, hasPermission: true }));
          return true;
        }
      } catch (error) {
        console.error("DeviceOrientation permission denied:", error);
        return false;
      }
    } else {
      // Non-iOS devices don't need permission
      setOrientation(prev => ({ ...prev, hasPermission: true }));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!orientation.isSupported) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      
      // Calculate tilt from vertical (for portrait mode, beta should be ~90 when upright)
      // For landscape, we'd check gamma
      const verticalTilt = beta !== null ? Math.abs(90 - Math.abs(beta)) : 0;
      const horizontalTilt = gamma !== null ? Math.abs(gamma) : 0;
      
      // Use the larger tilt angle
      const tiltAngle = Math.max(verticalTilt, horizontalTilt);
      const isLevel = tiltAngle <= LEVEL_THRESHOLD;

      setOrientation({
        alpha,
        beta,
        gamma,
        isLevel,
        tiltAngle,
        hasPermission: true,
        isSupported: true,
      });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [orientation.isSupported]);

  return { ...orientation, requestPermission };
}
