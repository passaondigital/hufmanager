import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Welcome page – now simply redirects to /home where the OnboardingAssistant
 * takes over for real (non-demo) accounts with onboarding_completed = false.
 */
export default function Welcome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let dest = "/home";
    if (role === "client") dest = "/client-home";
    else if (role === "admin") dest = "/admin/mission-control";
    else if (role === "employee") dest = "/employee";
    else if (role === "partner") dest = "/partner-home";
    navigate(dest, { replace: true });
  }, [user, role, navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
