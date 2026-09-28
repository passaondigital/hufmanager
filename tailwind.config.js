import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Ebenen-Leiter — Werte + Begruendung in src/index.css.
      // ACHTUNG: DIESE Datei ist die aktive Tailwind-Konfiguration
      // (Tailwind laedt .js vor .ts). tailwind.config.ts wird ignoriert.
      zIndex: {
        bar:    "var(--z-bar)",
        fab:    "var(--z-fab)",
        mode:   "var(--z-mode)",
        dialog: "var(--z-dialog)",
        menu:   "var(--z-menu)",
        tour:   "var(--z-tour)",
        toast:  "var(--z-toast)",
      },
      colors: {
        border: "hsl(30 10% 90%)",
        // Neutrale Tokens folgen den Theme-Variablen aus src/index.css (:root / .dark), damit Text und
        // Flächen im Dunkel-Modus lesbar sind (Release-Sprint 28.09.2026: text-foreground war fest #1A1510
        // → fast schwarz auf dunklen Karten). Hell-Modus bleibt praktisch identisch. Markenfarben unten fest.
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#F5970A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FFF9F0",
          foreground: "#453215",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#FEF3E2",
          foreground: "#F5970A",
        },
      },
      borderRadius: {
        lg: "1.25rem",
        md: "1rem",
        sm: "0.75rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
