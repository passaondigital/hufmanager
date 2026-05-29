import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/hufi-premium.css";

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
