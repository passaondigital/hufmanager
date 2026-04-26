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
    <div className="min-h-[300px] flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full border-destructive/30 shadow-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg">Hoppla!</h3>
          <p className="text-sm text-muted-foreground">Hier ist etwas im Galopp schiefgegangen.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/home"}>Zum Start</Button>
            <Button size="sm" onClick={() => window.location.reload()}>Neu laden</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppLayout() {
  const { isFullscreen } = useCockpitFullscreen();

  if (isFullscreen) {
    return (
      <div className="min-h-screen w-full max-w-md mx-auto bg-background relative shadow-xl overflow-hidden">
        <ErrorBoundary name="Fullscreen" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full max-w-md mx-auto bg-background relative shadow-2xl border-x border-border/50">
      <MobileHeader />
      
      <div className="sticky top-14 z-30 w-full bg-background/95">
        <TrialCountdownBanner />
        <SystemAnnouncementBanner />
        <OfflineBanner />
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 scrollbar-none">
        <ErrorBoundary name="MainContent" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
