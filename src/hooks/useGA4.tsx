import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA4, trackPageView } from "@/lib/analytics";

// HufManager Plattform GA4 ID – wird nach Cookie-Consent geladen
const PLATFORM_GA4_ID = ""; // TODO: Deine GA4 Measurement ID hier eintragen (z.B. "G-XXXXXXXXXX")

/**
 * Hook für GA4-Tracking.
 * - Initialisiert GA4 mit der Plattform-ID oder einer benutzerdefinierten ID
 * - Trackt automatisch Seitenaufrufe bei Route-Wechsel
 */
export function useGA4(customMeasurementId?: string) {
  const location = useLocation();
  const gaId = customMeasurementId || PLATFORM_GA4_ID;

  // GA4 initialisieren (nur wenn Cookie-Consent gegeben)
  useEffect(() => {
    if (gaId) {
      initGA4(gaId);
    }
  }, [gaId]);

  // Seitenaufrufe bei Navigation tracken
  useEffect(() => {
    if (gaId) {
      trackPageView(location.pathname + location.search);
    }
  }, [location.pathname, location.search, gaId]);
}
