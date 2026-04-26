import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "hufmanager-logo.png", "apple-touch-icon.png"],
      workbox: {
        // Limit auf 6 MB erhöht für große Bundles
        maximumFileSizeToCacheInBytes: 6000000,
        
        // Force new service worker to activate immediately
        skipWaiting: true,
        clientsClaim: true,
        
        // Cache static assets but NOT HTML (to prevent stale routing)
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        
        // Don't cache navigation requests - always fetch fresh HTML
        navigateFallback: null,
        
        // Cache-first strategy for assets only
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Network first for Supabase API calls (NOT auth) - fallback to cache
            urlPattern: ({ url }: { url: URL }) => {
              return url.hostname.endsWith('.supabase.co') && 
                     !url.pathname.startsWith('/auth/');
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: "Hufi",
        short_name: "Hufi",
        description: "App für mobile Pferdeprofis — Kunden, Pferde, Termine, Navigation & KI",
        theme_color: "#0a0700",
        background_color: "#0a0700",
        display: "standalone",
        orientation: "portrait",
        start_url: "/home",
        scope: "/",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/icon-72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshot-wide.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "HufManager Dashboard",
          },
          {
            src: "/screenshot-mobile.png",
            sizes: "1080x1920",
            type: "image/png",
            form_factor: "narrow",
            label: "HufManager Mobile",
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React MUST be the very first chunk resolved.
          // Rollup's CJS interop helpers for React/ReactDOM must NOT end up
          // inside an app chunk (e.g. AdminDashboard) — that creates a cycle:
          // vendor-react → AdminDashboard → radix → vendor-react, causing
          // forwardRef to be undefined when Radix evaluates at module top-level.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) return "vendor-react";
          // Named vendor splits (lazy-loaded, large libs)
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) return "charts";
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) return "pdf";
          if (id.includes("node_modules/@radix-ui")) return "radix";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/date-fns") || id.includes("node_modules/react-day-picker")) return "dates";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router")) return "router";
          // Catch-all for remaining node_modules: prevents Rollup from embedding
          // shared CJS interop helpers inside app chunks (AdminDashboard etc.),
          // which would otherwise create cross-chunk circular dependencies.
          if (id.includes("node_modules/")) return "vendor";
          // App: heavy page groups (only src/ code from here)
          if (id.includes("/pages/admin/") || id.includes("MissionControl")) return "AdminDashboard";
          if (id.includes("/pages/Kalender") || id.includes("/components/calendar")) return "Kalender";
          if (id.includes("/pages/Buchhaltung") || id.includes("/pages/GuV") || id.includes("/pages/Ausgaben") || id.includes("/pages/Fuhrpark")) return "HufiBusinessPages";
          if (id.includes("/pages/Netzwerk") || id.includes("/pages/HMConnect") || id.includes("/pages/Marketplace")) return "HufiConnectPages";
          if (id.includes("/pages/ImportCenter")) return "ImportCenter";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
