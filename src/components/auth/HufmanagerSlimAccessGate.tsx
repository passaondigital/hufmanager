import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CreditCard, RefreshCcw, LogOut, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useHufmanagerSlimAccess } from "@/hooks/useHufmanagerSlimAccess";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

interface HufmanagerSlimAccessGateProps {
  children: ReactNode;
}

// Phase 8 access gate: wraps only the four actual HufManager Slim WORK
// routes inside HufManagerSlimShell (/home, /home/tour, /home/kunden,
// /home/hufi-hufanalyse, /home/finanzen) -- deliberately NOT /home/mehr,
// which is this shell's own "Mehr & Einstellungen" screen and already
// contains the real in-app logout button and the link to /management/abo
// (billing/contract). Wrapping /home/mehr too would lock a provider out of
// exactly the escape hatch Phase 8 requires stay reachable.
// No design system change: reuses the same Card/Button primitives as
// PaymentBlockedScreen, just with in-app navigation (to /management/abo,
// HufManager's real billing route) instead of that screen's external
// hufiapp.de links, plus a real logout escape -- both required by this
// task's Phase 8 spec and missing from that existing screen, which this
// component does not touch or replace.
export function HufmanagerSlimAccessGate({ children }: HufmanagerSlimAccessGateProps) {
  const { loading, context, error } = useHufmanagerSlimAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  // A read failure (network, RLS surprise, etc.) must not read as "no
  // access" -- fail open rather than lock out a paying provider because
  // of a transient error. Mirrors useSubscription's own non-blocking
  // error handling.
  if (error) {
    return <>{children}</>;
  }

  if (!context || context.hasAccess) {
    return <>{children}</>;
  }

  const isTrial = context.reasonCode === "TRIAL_EXPIRED";
  const isFrozen = context.reasonCode === "FROZEN" || context.reasonCode === "LOCKED";

  const title = isTrial
    ? "Testphase beendet"
    : isFrozen
      ? "Zugang beendet"
      : "Kein aktiver Zugang";

  const description = isTrial
    ? "Deine 14-tägige Testphase für HufManager Slim ist abgelaufen."
    : isFrozen
      ? "Dein HufManager-Slim-Abo ist beendet."
      : "Für HufManager Slim ist aktuell kein aktiver Zugang hinterlegt.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            {isTrial ? <Hourglass className="h-10 w-10 text-muted-foreground" /> : <Lock className="h-10 w-10 text-muted-foreground" />}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full h-12 text-base gap-2" onClick={() => navigate("/management/abo")}>
            {isFrozen ? <RefreshCcw className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            {isFrozen ? "Jetzt reaktivieren" : "Zu Abo & Zahlung"}
          </Button>
          <Button variant="outline" className="w-full h-12 text-base gap-2" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
