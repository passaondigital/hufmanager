import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/hufi-premium.css";
import { captureAttribution } from "@/lib/attribution";
import { initWakeWordTestOverride } from "@/config/featureFlags";
import { ACTIVE_FLAVOR } from "@/config/appFlavor";

// First-Touch-Attribution VOR dem Render erfassen (App/UTM/Referrer/Landing-Page)
captureAttribution();

// Gezielter Hey-Hufi-Test-Zugang (?wakeword=test) VOR dem Render erfassen,
// damit er unabhängig von späterer Client-Navigation für die Session gilt.
initWakeWordTestOverride();

// HufManager-Startup: Die wenigen Chunks, die direkt rund um Login und den
// ersten Provider-Screen gebraucht werden, parallel vorladen. Dadurch kann der
// einheitliche AuthLoadingScreen stehen bleiben, waehrend Auth/Produkt/Profile
// aufgeloest werden, statt danach noch einen zweiten Suspense-Loader zu zeigen.
// HufiApp behaelt sein eigenes Ladeverhalten.
if (ACTIVE_FLAVOR === "hufmanager") {
  void Promise.all([
    import("@/pages/Auth"),
    import("@/pages/Welcome"),
    import("@/components/slim/HufManagerSlimShell"),
    import("@/components/slim/TodayScreen"),
  ]).catch((error) => {
    console.warn("HufManager startup preload skipped", error);
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// Start Core Web Vitals measurement after hydration
const startPerformanceMeasurement = () => {
  import("./lib/performance").then(({ measurePerformance }) => measurePerformance());
};

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(startPerformanceMeasurement, { timeout: 2500 });
} else {
  window.setTimeout(startPerformanceMeasurement, 1500);
}
