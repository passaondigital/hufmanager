import { useState, useEffect, useRef, useCallback } from "react";
import type { RouteStep } from "@/lib/routeService";

interface TurnByTurnState {
  currentStepIndex: number;
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNextTurn: number | null; // meters
  speedKmh: number | null;
  arrived: boolean;
  arrivalTarget: string | null;
}

const ARRIVAL_THRESHOLD_M = 50;
const ANNOUNCE_DISTANCES = [300, 50]; // meters

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useTurnByTurn(
  steps: RouteStep[] | undefined,
  routeCoords: [number, number][] | undefined, // GeoJSON coords as [lng, lat]
  userLocation: [number, number] | null, // [lat, lng]
  destination: [number, number] | null, // [lat, lng]
  destinationName: string | null,
  enabled: boolean
) {
  const [state, setState] = useState<TurnByTurnState>({
    currentStepIndex: 0,
    currentStep: null,
    nextStep: null,
    distanceToNextTurn: null,
    speedKmh: null,
    arrived: false,
    arrivalTarget: null,
  });

  const announcedRef = useRef<Set<string>>(new Set());
  const speechEnabledRef = useRef(true);

  // Speech synthesis
  const speak = useCallback((text: string) => {
    if (!speechEnabledRef.current || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Track speed from geolocation
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speed = pos.coords.speed;
        if (speed != null && speed >= 0) {
          setState(prev => ({ ...prev, speedKmh: Math.round(speed * 3.6) }));
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  // Track position against route steps
  useEffect(() => {
    if (!enabled || !userLocation || !steps?.length || !routeCoords?.length) return;

    const [userLat, userLng] = userLocation;

    // Check arrival at destination
    if (destination) {
      const distToDest = haversineMeters(userLat, userLng, destination[0], destination[1]);
      if (distToDest <= ARRIVAL_THRESHOLD_M) {
        const key = `arrived-${destination[0]}-${destination[1]}`;
        if (!announcedRef.current.has(key)) {
          announcedRef.current.add(key);
          speak(`Angekommen bei ${destinationName || "Ziel"}`);
        }
        setState(prev => ({
          ...prev,
          arrived: true,
          arrivalTarget: destinationName,
          distanceToNextTurn: Math.round(distToDest),
        }));
        return;
      }
    }

    // Find closest route coordinate to determine progress
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < routeCoords.length; i++) {
      const [lng, lat] = routeCoords[i]; // GeoJSON is [lng, lat]
      const d = haversineMeters(userLat, userLng, lat, lng);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    // Find which step we're in based on waypoint indices
    let activeStep = 0;
    for (let i = 0; i < steps.length; i++) {
      const wp = steps[i].way_points;
      if (wp && closestIdx >= wp[0] && closestIdx <= wp[wp.length - 1]) {
        activeStep = i;
        break;
      }
      if (wp && closestIdx < wp[0]) break;
      activeStep = i;
    }

    const currentStep = steps[activeStep] || null;
    const nextStep = steps[activeStep + 1] || null;

    // Distance to next turn waypoint
    let distToTurn: number | null = null;
    if (nextStep?.way_points?.length) {
      const wpIdx = nextStep.way_points[0];
      if (wpIdx < routeCoords.length) {
        const [tLng, tLat] = routeCoords[wpIdx];
        distToTurn = Math.round(haversineMeters(userLat, userLng, tLat, tLng));
      }
    }

    // Voice announcements
    if (nextStep && distToTurn != null) {
      for (const threshold of ANNOUNCE_DISTANCES) {
        if (distToTurn <= threshold && distToTurn > threshold - 30) {
          const key = `step-${activeStep + 1}-${threshold}`;
          if (!announcedRef.current.has(key)) {
            announcedRef.current.add(key);
            const distText = threshold >= 100 ? `In ${threshold} Metern` : `In ${threshold} Metern`;
            speak(`${distText}, ${nextStep.instruction}`);
          }
        }
      }
    }

    setState(prev => ({
      ...prev,
      currentStepIndex: activeStep,
      currentStep,
      nextStep,
      distanceToNextTurn: distToTurn,
      arrived: false,
      arrivalTarget: null,
    }));
  }, [userLocation, steps, routeCoords, destination, destinationName, enabled, speak]);

  // Reset announced set when steps change
  useEffect(() => {
    announcedRef.current.clear();
  }, [steps]);

  const resetArrival = useCallback(() => {
    setState(prev => ({ ...prev, arrived: false, arrivalTarget: null }));
  }, []);

  const toggleSpeech = useCallback(() => {
    speechEnabledRef.current = !speechEnabledRef.current;
  }, []);

  return { ...state, resetArrival, toggleSpeech, speechEnabled: speechEnabledRef.current };
}
