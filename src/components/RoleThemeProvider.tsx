import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function RoleThemeProvider({ children }: { children: React.ReactNode }) {
  const { userType } = useAuth();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("theme-pro", "theme-owner");
    if (userType === 'owner') {
      root.classList.add("theme-owner");
    } else {
      root.classList.add("theme-pro");
    }
  }, [userType]);

  return <>{children}</>;
}
