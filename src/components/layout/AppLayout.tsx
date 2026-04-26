import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { TrialCountdownBanner } from "@/components/subscription/TrialCountdownBanner";
import { SystemAnnouncementBanner } from "@/components/announcements/SystemAnnouncementBanner";
import { useCockpitFullscreen } from "@/components/day-cockpit/CockpitFullscreenContext";

function ProviderErrorFallback() {
  return (
    <div className="min-h-[300px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Etwas ist schiefgelaufen</h3>
            <p className="text-sm text-muted-foreground mt-1">Ein unerwarteter Fehler ist aufgetreten.</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/home"}>
              <Home className="h-4 w-4 mr-1.5" />
              Zum Start
            </Button>
            <Button size="sm" onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Neu laden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppLayout() {
  const { isFullscreen } = useCockpitFullscreen();

  // Fullscreen mode (no headers/footers)
  if (isFullscreen) {
    return (
      <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-background relative shadow-xl">
        <ErrorBoundary name="ProviderFullscreen" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </div>
    );
  }

  // Standard Hufi Mobile-First Layout
  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-md mx-auto bg-background overflow-safe relative shadow-2xl ring-1 ring-border/50">
      <MobileHeader onMenuClick={() => window.location.href = "/archiv"} />
      
      <TrialCountdownBanner />
      <SystemAnnouncementBanner />
      <OfflineBanner />

      <main className="flex-1 overflow-auto px-4 py-4 pb-[80px] overflow-x-hidden">
        <ErrorBoundary name="ProviderMain" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
