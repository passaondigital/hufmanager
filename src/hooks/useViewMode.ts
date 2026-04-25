import { useState, useCallback } from "react";

export type ViewMode = "pro" | "privat";
const KEY = "hufi_view_mode";

export function useViewMode() {
  const [mode, setModeState] = useState<ViewMode>(
    () => (localStorage.getItem(KEY) as ViewMode) ?? "pro"
  );

  const setMode = useCallback((m: ViewMode) => {
    localStorage.setItem(KEY, m);
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "pro" ? "privat" : "pro");
  }, [mode, setMode]);

  return { mode, setMode, toggleMode, isPrivat: mode === "privat" };
}
