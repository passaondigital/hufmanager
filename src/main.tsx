import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/hufi-premium.css";
import { measurePerformance } from "./lib/performance";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// Start Core Web Vitals measurement after hydration
measurePerformance();
