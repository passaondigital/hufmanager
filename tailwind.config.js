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
        background: "#FFFFFF",
        foreground: "#1A1510",
        primary: {
          DEFAULT: "#F5970A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FFF9F0",
          foreground: "#453215",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1510",
        },
        muted: {
          DEFAULT: "#F9F8F6",
          foreground: "#70685C",
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
