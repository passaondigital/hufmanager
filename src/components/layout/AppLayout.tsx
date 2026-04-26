import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertTriangle, RefreshCw, Home, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { AppHeader } from "./AppHeader";
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
              Zum Dashboard
            </Button>
            <Button size="sm" onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Seite neu laden
            </Button>
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
      <div className="min-h-[100dvh] w-full bg-background relative">
        <ErrorBoundary name="ProviderFullscreen" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-slate-50 overflow-safe pb-20">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-50">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-x-hidden lg:ml-64">
        {/* Neuer, aufgeräumter Mobile Header (ersetzt den alten komplett) */}
        <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Desktop Header - hidden on mobile */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        <TrialCountdownBanner />
        <SystemAnnouncementBanner />
        <OfflineBanner />

        <main className="flex-1 overflow-auto w-full max-w-lg mx-auto bg-white min-h-[calc(100vh-4rem)] shadow-sm">
          <ErrorBoundary name="ProviderMain" fallback={<ProviderErrorFallback />}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      
      <MobileBottomNav />
    </div>
  );
}
