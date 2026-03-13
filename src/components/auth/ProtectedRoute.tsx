import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentBlockedScreen } from "@/components/subscription/PaymentBlockedScreen";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("provider" | "client" | "admin" | "employee" | "partner")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Check if this is a botschafter route — only needs auth, not a specific role
  const isBotschafterRoute = location.pathname.startsWith("/botschafter");

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
