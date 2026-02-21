import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";

const Index = () => {
  const { user, role, loading } = useAuth();

  // If user is logged in, redirect to their role-specific home
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

  // Not logged in (or still loading) → show landing page
  return <WebsiteHome />;
};

export default Index;
