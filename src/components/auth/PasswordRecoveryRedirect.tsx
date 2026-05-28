import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PasswordRecoveryRedirect({ children }: { children: React.ReactNode }) {
  const { isPasswordRecovery, forcePasswordChange } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      (isPasswordRecovery || forcePasswordChange) &&
      location.pathname !== "/update-password"
    ) {
      navigate("/update-password", { replace: true });
    }
  }, [isPasswordRecovery, forcePasswordChange, location.pathname, navigate]);

  return <>{children}</>;
}
