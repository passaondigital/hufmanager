import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DEMO_EMAIL = "hufbearbeiter.hufmanager@gmail.com";

export function useDemoActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPathRef = useRef<string>("");

  const isDemoUser = user?.email === DEMO_EMAIL;

  // Track page view
  const trackPageView = useCallback(async (path: string) => {
    if (!isDemoUser || !user?.email) return;

    try {
      await supabase.from("demo_activity_logs").insert({
        user_email: user.email,
        activity_type: "page_view",
        page_path: path,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
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
      await supabase.from("demo_activity_logs").insert({
        user_email: user.email,
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
      await supabase.from("demo_activity_logs").insert({
        user_email: user.email,
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
