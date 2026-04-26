import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";
import Landing from "@/pages/Landing";
import { getPostLoginPath } from "@/lib/portal-user-detect";

const Index = () => {
  const { user, role, loading } = useAuth();
  const hostname = window.location.hostname;

  // hufmanager.de legacy domain → show old website during transition
  if (hostname === "www.hufmanager.de" || hostname === "hufmanager.de") {
    return <WebsiteHome />;
  }

  // Logged in → redirect to role-specific dashboard
  if (!loading && user && role) {
    return <Navigate to={getPostLoginPath(role, user.email)} replace />;
  }

  // Not logged in → show new Landing page
  if (!loading && !user) {
    return <Landing />;
  }

  // Still loading → null (AuthLoadingScreen in AppContent handles this)
  return null;
};

export default Index;
