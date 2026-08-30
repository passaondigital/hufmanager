import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentBlockedScreen } from "@/components/subscription/PaymentBlockedScreen";
import { LimitedAccessState } from "@/components/auth/LimitedAccessState";
import { ProductChoiceGate } from "@/components/auth/ProductChoiceGate";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("provider" | "client" | "admin" | "employee" | "partner")[];
}

function RouteLoader() {
  return <AuthLoadingScreen />;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, roleResolution, loading, signOut } = useAuth();
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

  if (loading || isRecoveringRecentSession) {
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

  // Role still resolving (non-botschafter routes)
  if (roleResolution === "resolving") {
    return <RouteLoader />;
  }

  if (roleResolution !== "resolved" || !role) {
    return <LimitedAccessState onSignOut={signOut} />;
  }

  return (
    <ProductChoiceGate userId={user.id} onReady={(readyChildren) => readyChildren}>
      <ResolvedProtectedRoute role={role} allowedRoles={allowedRoles}>{children}</ResolvedProtectedRoute>
    </ProductChoiceGate>
  );
}

function ResolvedProtectedRoute({ children, allowedRoles, role }: ProtectedRouteProps & { role: NonNullable<ReturnType<typeof useAuth>["role"]> }) {
  const { status, loading: subLoading } = useSubscription();

  if (subLoading) {
    return <RouteLoader />;
  }

  // Zahlungsproblem bei laufendem Abo → Sperre (nur Provider)
  if (role === "provider" && status === "past_due") {
    return <PaymentBlockedScreen variant="past_due" />;
  }
  // Trial-Ablauf blockt NICHT: er wird über account_status='expired' als
  // nicht-blockierender TrialPaywall-Banner gezeigt, Starter-Limits greifen
  // automatisch. subscription_status='cancelled' bleibt echten Kündigungen
  // vorbehalten und wird hier bewusst nicht (mehr) als Trial-Ablauf behandelt.

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
