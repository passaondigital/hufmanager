import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/hufi-premium.css";
import { captureAttribution } from "@/lib/attribution";
import { initWakeWordTestOverride } from "@/config/featureFlags";

// First-Touch-Attribution VOR dem Render erfassen (App/UTM/Referrer/Landing-Page)
captureAttribution();

// Gezielter Hey-Hufi-Test-Zugang (?wakeword=test) VOR dem Render erfassen,
// damit er unabhängig von späterer Client-Navigation für die Session gilt.
initWakeWordTestOverride();

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
