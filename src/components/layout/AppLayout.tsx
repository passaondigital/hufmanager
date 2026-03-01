import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { Menu, Sun, Moon, Search, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TrialCountdownBanner } from "@/components/subscription/TrialCountdownBanner";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";
import { useAutoflowMode, AutoflowMode } from "@/hooks/useAutoflowMode";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { mode, updateMode, loading: autoflowLoading, MODE_LABELS } = useAutoflowMode();
  
  const modeColors: Record<AutoflowMode, string> = {
    basis: "text-blue-500",
    plus: "text-amber-500",
    premium: "text-emerald-500",
  };
  
  // Initialize demo activity tracker for automatic page view tracking
  useDemoActivityTracker();

  return (
    <div className="min-h-[100dvh] flex w-full bg-background overflow-safe">
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

      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden">
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

        {/* Main content with bottom nav spacing on mobile */}
        <main className="flex-1 overflow-auto px-4 py-4 lg:p-6 pb-bottom-nav overflow-x-hidden">
          <Outlet />
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
    </div>
  );
}
