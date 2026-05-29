import { useAuth } from "@/hooks/useAuth";
import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { getPostLoginPath } from "@/lib/portal-user-detect";

const WebsiteHome = lazy(() => import("@/pages/website/WebsiteHome"));

// Erkennt ob die App als installiertes PWA läuft (Homescreen-Kachel)
function isPWAStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

const Index = () => {
  const { user, role, loading } = useAuth();
  const hostname = window.location.hostname;

  // hufmanager.de = statische Landing/Salespage (eigener Nginx-Block)
  // app.hufmanager.de = die App → hier landen, direkt zur Auth/App
  // hufiapp.de leitet per Nginx auf hufmanager.de weiter → kommt nie hier an

  // app.hufmanager.de → auth flow
  // If logged in, redirect to role-specific home
  if (!loading && user && role) {
    return <Navigate to={getPostLoginPath(role, user.email)} replace />;
  }

  // Not logged in on app subdomain → redirect to auth
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading → show nothing (AuthLoadingScreen in App.tsx handles this)
  return null;
};

export default Index;
