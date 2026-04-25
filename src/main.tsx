import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "https://e4032f9ae94098bb48fabd07b0ff259a@o4511282434998272.ingest.de.sentry.io/4511282438471760", sendDefaultPii: true });
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { measurePerformance } from "./lib/performance";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// Start Core Web Vitals measurement after hydration
measurePerformance();
