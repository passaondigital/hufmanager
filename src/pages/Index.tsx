import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";
import { getPostLoginPath } from "@/lib/portal-user-detect";

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

  // Marketing landing on the bare apex / www; auth flow on app.* and everywhere else.
  // Legacy hufmanager.de hosts are aliased so existing HufManager users don't
  // land on the auth screen when they hit their old bookmark.
  // PWA (standalone) überspringt immer die Landing Page — direkt zur App.
  const isMainDomain =
    hostname === "hufiapp.de" ||
    hostname === "www.hufiapp.de" ||
    hostname === "hufmanager.de" ||
    hostname === "www.hufmanager.de";

  if (isMainDomain && !isPWAStandalone()) {
    return <WebsiteHome />;
  }

  // app.hufiapp.de / app.hufmanager.de (or preview/localhost) → auth flow
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
