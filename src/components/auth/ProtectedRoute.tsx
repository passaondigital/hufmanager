import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentBlockedScreen } from "@/components/subscription/PaymentBlockedScreen";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("provider" | "client" | "admin" | "employee" | "partner")[];
}

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const location = useLocation();
  const lastKnownUserRef = useRef(user);
  const [authGraceExpired, setAuthGraceExpired] = useState(false);

  useEffect(() => {
    if (user) {
      lastKnownUserRef.current = user;
      setAuthGraceExpired(false);
      return;
    }

    if (loading) return;

    if (!lastKnownUserRef.current) {
      setAuthGraceExpired(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      lastKnownUserRef.current = null;
      setAuthGraceExpired(true);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [user, loading]);

  // Check if this is a botschafter route — only needs auth, not a specific role
  const isBotschafterRoute = location.pathname.startsWith("/botschafter");
  const isRecoveringRecentSession = !user && !!lastKnownUserRef.current && !authGraceExpired;

  if (loading || subLoading || isRecoveringRecentSession) {
    return <RouteLoader />;
  }

  // Not authenticated
  if (!user) {
    // Botschafter routes redirect to botschafter login, not app login
    if (isBotschafterRoute) {
      return <Navigate to="/botschafter/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // For botschafter routes: auth is enough, no role check needed
  // (The individual pages check pferdeakte_botschafter status themselves)
  if (isBotschafterRoute) {
    return <>{children}</>;
  }

  // Role not yet loaded (non-botschafter routes)
  if (!role) {
    return <RouteLoader />;
  }

  // Check for payment issues (only for providers)
  if (role === "provider" && status === "past_due") {
    return <PaymentBlockedScreen />;
  }

  // Check if user has allowed role
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect based on role
    if (role === "client") {
      return <Navigate to="/client-home" replace />;
    }
    if (role === "admin") {
      return <Navigate to="/admin/mission-control" replace />;
    }
    if (role === "employee") {
      return <Navigate to="/employee" replace />;
    }
    if (role === "partner") {
      return <Navigate to="/partner-home" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
