import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertTriangle, RefreshCw, Home, Menu, Sun, Moon, Search, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConnectionStatus } from "@/components/offline/ConnectionStatus";
import { SpeedDialFAB } from "./SpeedDialFAB";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { FeierabendWaechter } from "@/components/tracking/FeierabendWaechter";
import { DemoStickyBanner } from "@/components/demo/DemoStickyBanner";
import { DemoPresentationBanner } from "@/components/demo/DemoPresentationBanner";
import { TrialCountdownBanner } from "@/components/subscription/TrialCountdownBanner";
import { SystemAnnouncementBanner } from "@/components/announcements/SystemAnnouncementBanner";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";
import { useAutoflowMode, AutoflowMode } from "@/hooks/useAutoflowMode";
import { useCockpitFullscreen } from "@/components/day-cockpit/CockpitFullscreenContext";
import { BotschafterReminder, useBotschafterReminderVisible } from "@/components/shared/BotschafterReminder";

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
            <p className="text-sm text-muted-foreground mt-1">
              Ein unerwarteter Fehler ist aufgetreten.
            </p>
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
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { mode, updateMode, loading: autoflowLoading, MODE_LABELS } = useAutoflowMode();
  const { isFullscreen } = useCockpitFullscreen();
  const reminderVisible = useBotschafterReminderVisible();
  
  const modeColors: Record<AutoflowMode, string> = {
    basis: "text-blue-500",
    plus: "text-amber-500",
    premium: "text-emerald-500",
  };
  
  // Initialize demo activity tracker for automatic page view tracking
  useDemoActivityTracker();

  // Fullscreen mode: render only the outlet with a small burger overlay
  if (isFullscreen) {
    return (
      <div className="min-h-[100dvh] w-full bg-background relative">
        {/* Burger icon overlay — half transparent, 24px, top-left */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed top-3 left-3 z-[10000] flex items-center justify-center rounded-lg transition-all duration-300"
          style={{ width: 36, height: 36, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          aria-label="Menü öffnen"
        >
          <Menu className="h-5 w-5 text-white/80" />
        </button>
        {/* Sidebar Sheet for fullscreen mode */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <ErrorBoundary name="ProviderFullscreen" fallback={<ProviderErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background overflow-safe">
      <DemoPresentationBanner />
      <div className="flex flex-1">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-x-hidden lg:ml-64">
        {/* Mobile Header with Hamburger */}
        <header 
          className="lg:hidden h-14 max-h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="h-10 w-10"
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img 
              src="/hufmanager-logo.png" 
              alt="HufManager" 
              className="h-7 w-auto"
            />
          </div>
          
          {/* Mobile Actions - with proper spacing for touch targets */}
          <div className="flex items-center gap-1">
            {/* Connection Status - Mobile */}
            <ConnectionStatus />
            
            {/* AutoFlow Quick Toggle - Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 min-w-[40px] relative" title={`AutoFlow ${MODE_LABELS[mode]}`}>
                  <Zap className={`h-5 w-5 ${modeColors[mode]}`} />
                  {mode === "premium" && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border">
                <DropdownMenuLabel className="text-foreground text-xs">AutoFlow Modus</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {(["basis", "plus", "premium"] as AutoflowMode[]).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => updateMode(m)}
                    className={`h-10 cursor-pointer flex items-center gap-2 ${mode === m ? "bg-accent" : ""}`}
                  >
                    <Zap className={`h-4 w-4 ${modeColors[m]}`} />
                    <span className="text-sm font-medium text-foreground">{MODE_LABELS[m]}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => navigate("/autoflow")} className="h-10 cursor-pointer text-xs text-muted-foreground">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  AutoFlow konfigurieren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchOpen(true)}
              className="h-10 w-10 min-w-[40px]"
              aria-label="Suchen"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            {/* Feierabend-Wächter - Mobile */}
            <FeierabendWaechter />
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 min-w-[40px]"
              aria-label="Theme wechseln"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-primary" />
              ) : (
                <Moon className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            
            <NotificationBell />
          </div>
        </header>
        
        {/* Mobile GlobalSearch */}
        <GlobalSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

        {/* Desktop Header - hidden on mobile */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* Trial Countdown Banner */}
        <TrialCountdownBanner />

        {/* System Announcements */}
        <SystemAnnouncementBanner />

        {/* Offline Banner - shows when offline or syncing */}
        <OfflineBanner />

        {/* Main content with bottom nav spacing on mobile */}
        <main className={`flex-1 overflow-auto px-4 py-4 lg:p-6 pb-bottom-nav overflow-x-hidden ${reminderVisible ? "pb-[120px] lg:pb-[100px]" : ""}`}>
          <ErrorBoundary name="ProviderMain" fallback={<ProviderErrorFallback />}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Speed Dial FAB - hidden on mobile (replaced by bottom nav) */}
      <div className="hidden lg:block">
        <SpeedDialFAB />
      </div>
      
      {/* Demo Account Sticky Banner */}
      <DemoStickyBanner />
      
      {/* Botschafter Reminder Banner */}
      <BotschafterReminder />
      </div>
    </div>
  );
}
