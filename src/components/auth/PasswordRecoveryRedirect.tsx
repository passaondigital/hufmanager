import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PasswordRecoveryRedirect({ children }: { children: React.ReactNode }) {
  const { isPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If in password recovery mode and not already on update-password page, redirect
    if (isPasswordRecovery && location.pathname !== "/update-password") {
      navigate("/update-password", { replace: true });
    }
  }, [isPasswordRecovery, location.pathname, navigate]);

  return <>{children}</>;
}
