import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "hufmanager-logo.png"],
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
        name: "HufManager",
        short_name: "HufManager",
        description: "Professionelle Hufpflege-Verwaltung für Hufbearbeiter",
        theme_color: "#000000",
        background_color: "#000000",
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
