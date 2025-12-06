import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentBlockedScreen } from "@/components/subscription/PaymentBlockedScreen";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("provider" | "client")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const location = useLocation();

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role not yet loaded
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
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect based on role
    if (role === "client") {
      return <Navigate to="/client-home" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
