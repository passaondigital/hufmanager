import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { del, clear } from "idb-keyval";

/**
 * Universal logout hook - used across ALL app areas.
 * Clears: Supabase session, React Query cache, app-specific localStorage, IndexedDB offline queue.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      // 1. Sign out from Supabase
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error (proceeding anyway):", e);
    }

    // 2. Clear React Query cache
    queryClient.clear();

    // 3. Clear app-specific localStorage keys (preserve theme preference)
    const keysToKeep = ["theme", "vite-ui-theme"];
    const savedValues: Record<string, string | null> = {};
    keysToKeep.forEach((key) => {
      savedValues[key] = localStorage.getItem(key);
    });
    localStorage.clear();
    keysToKeep.forEach((key) => {
      if (savedValues[key] !== null) {
        localStorage.setItem(key, savedValues[key]!);
      }
    });

    // 4. Clear IndexedDB offline queue
    try {
      await clear();
    } catch (e) {
      console.warn("IndexedDB clear error:", e);
    }

    // 5. Redirect to auth
    navigate("/auth", { replace: true });
  };

  return logout;
}
