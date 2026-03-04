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
    const dest = role === "client" ? "/client-home" : "/home";
    navigate(dest, { replace: true });
  }, [user, role, navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
