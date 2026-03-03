/**
 * Google Analytics 4 (GA4) Integration
 * 
 * Lädt das GA4 gtag.js Script dynamisch und stellt Tracking-Funktionen bereit.
 * DSGVO-konform: Wird nur nach Cookie-Consent geladen.
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

let isInitialized = false;

/**
 * Lädt GA4 mit der angegebenen Measurement ID.
 * Kann mehrfach aufgerufen werden – lädt nur einmal.
 */
export function initGA4(measurementId: string) {
  if (!measurementId || isInitialized) return;
  if (typeof window === "undefined") return;

  // Prüfe ob Cookie-Consent gegeben wurde
  const consent = localStorage.getItem("cookie-consent");
  if (consent !== "accepted") return;

  isInitialized = true;

  // gtag.js Script laden
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  // dataLayer + gtag initialisieren
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true, // DSGVO: IP-Anonymisierung
    cookie_flags: "SameSite=None;Secure",
  });
}

/**
 * Trackt einen Seitenaufruf (für SPA-Navigation).
 */
export function trackPageView(path: string, title?: string) {
  if (!isInitialized || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Trackt ein benutzerdefiniertes Event.
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (!isInitialized || !window.gtag) return;
  window.gtag("event", eventName, params);
}
