import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/layout/*.tsx",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(30 10% 90%)",
        input: "hsl(30 10% 90%)",
        ring: "hsl(38 92% 50%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(20 14.3% 4.1%)",
        primary: {
          DEFAULT: "#F5970A", // Das echte Hufi Orange
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(38 92% 95%)", // Sehr sanftes Creme-Orange
          foreground: "hsl(38 92% 20%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(0 0% 100%)",
        },
        muted: {
          DEFAULT: "hsl(30 10% 96%)",
          foreground: "hsl(25 5% 45%)",
        },
        accent: {
          DEFAULT: "hsl(38 92% 90%)",
          foreground: "hsl(38 92% 20%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(20 14.3% 4.1%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(20 14.3% 4.1%)",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
