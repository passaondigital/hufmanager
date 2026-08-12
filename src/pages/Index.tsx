import { useAuth } from "@/hooks/useAuth";
import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { getPostLoginPath } from "@/lib/portal-user-detect";
import { ACTIVE_FLAVOR } from "@/config/appFlavor";
import { LimitedAccessState } from "@/components/auth/LimitedAccessState";

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
  const { user, role, roleResolution, loading, signOut } = useAuth();

  // Noch am Laden → nichts zeigen (AuthLoadingScreen in App.tsx übernimmt)
  if (loading) return null;

  // Eingeloggt → rollenspezifische Startseite
  if (user && role) {
    return <Navigate to={getPostLoginPath(role, user.email)} replace />;
  }

  if (user && roleResolution !== "resolved") {
    return <LimitedAccessState onSignOut={signOut} />;
  }

  // Nicht eingeloggt:
  // - hufiapp.de im Browser → hochwertige Landingpage als Einstieg
  // - installierte PWA (Homescreen) oder hufmanager-Flavor (app.hufmanager.de
  //   ist die App-Subdomain, Salespage liegt auf hufmanager.de) → direkt zur Anmeldung
  if (ACTIVE_FLAVOR === "hufiapp" && !isPWAStandalone()) {
    return <WebsiteHome />;
  }

  return <Navigate to="/auth" replace />;
};

export default Index;
