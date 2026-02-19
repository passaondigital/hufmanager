import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isDemoEmail } from "@/lib/demo-accounts";

// DSGVO: Hash email to anonymize tracking data
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + "huf_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "anon_" + hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useDemoActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPathRef = useRef<string>("");

  const isDemoUser = isDemoEmail(user?.email);

  // Track page view
  const trackPageView = useCallback(async (path: string) => {
    if (!isDemoUser || !user?.email) return;

    try {
      // DSGVO: Use anonymized hash instead of plain email
      const anonymizedId = await hashEmail(user.email);
      await supabase.from("demo_activity_logs").insert({
        user_email: anonymizedId,
        activity_type: "page_view",
        page_path: path,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to track page view:", error);
    }
  }, [isDemoUser, user?.email]);

  // Track action
  const trackAction = useCallback(async (actionName: string, metadata?: Record<string, unknown>) => {
    if (!isDemoUser || !user?.email) return;

    try {
      const anonymizedId = await hashEmail(user.email);
      await supabase.from("demo_activity_logs").insert({
        user_email: anonymizedId,
        activity_type: "action",
        action_name: actionName,
        page_path: location.pathname,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to track action:", error);
    }
  }, [isDemoUser, user?.email, location.pathname]);

  // Track CopeCart click
  const trackCopecartClick = useCallback(async (plan: string, url: string) => {
    if (!isDemoUser || !user?.email) return;

    try {
      const anonymizedId = await hashEmail(user.email);
      await supabase.from("demo_activity_logs").insert({
        user_email: anonymizedId,
        activity_type: "copecart_click",
        copecart_plan: plan,
        copecart_url: url,
        page_path: location.pathname,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to track CopeCart click:", error);
    }
  }, [isDemoUser, user?.email, location.pathname]);

  // Auto-track page views
  useEffect(() => {
    if (isDemoUser && location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      trackPageView(location.pathname);
    }
  }, [isDemoUser, location.pathname, trackPageView]);

  return {
    isDemoUser,
    trackAction,
    trackCopecartClick,
  };
}
