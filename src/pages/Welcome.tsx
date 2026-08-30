import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

/**
 * Welcome page – redirects to the correct authenticated start page.
 * While that decision happens, keep the same branded startup screen instead
 * of flashing a separate spinner between auth and the dashboard.
 */
export default function Welcome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const dest = role === "client" ? "/client-home" : "/home";
    navigate(dest, { replace: true });
  }, [user, role, navigate]);

  return <AuthLoadingScreen />;
}
