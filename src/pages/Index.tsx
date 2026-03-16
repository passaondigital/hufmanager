import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";
import { getPostLoginPath } from "@/lib/portal-user-detect";

const Index = () => {
  const { user, role, loading } = useAuth();
  const hostname = window.location.hostname;

  // www.hufmanager.de or hufmanager.de → always landing page, no auth check
  const isMainDomain =
    hostname === "www.hufmanager.de" ||
    hostname === "hufmanager.de";

  if (isMainDomain) {
    return <WebsiteHome />;
  }

  // app.hufmanager.de (or preview/localhost) → auth flow
  // If logged in, redirect to role-specific home
  if (!loading && user && role) {
    const roleToPath: Record<string, string> = {
      admin: "/admin/mission-control",
      provider: "/home",
      employee: "/employee",
      partner: "/partner-home",
      client: "/client-home",
    };
    return <Navigate to={roleToPath[role] || "/home"} replace />;
  }

  // Not logged in on app subdomain → redirect to auth
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading → show nothing (AuthLoadingScreen in App.tsx handles this)
  return null;
};

export default Index;
