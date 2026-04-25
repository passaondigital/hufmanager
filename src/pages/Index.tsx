import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";
import { getPostLoginPath } from "@/lib/portal-user-detect";

const Index = () => {
  const { user, role, loading } = useAuth();
  const hostname = window.location.hostname;

  // www.hufiapp.de or hufiapp.de → always landing page, no auth check
  const isMainDomain =
    hostname === "www.hufiapp.de" ||
    hostname === "hufiapp.de";

  if (isMainDomain) {
    return <WebsiteHome />;
  }

  // app.hufmanager.de (or preview/localhost) → auth flow
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
