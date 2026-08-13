import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "hufmanager-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored as Theme) || defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolvedTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
      root.dataset.theme = theme;
    }

    applyTheme();
    localStorage.setItem(storageKey, theme);

    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme, storageKey]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
