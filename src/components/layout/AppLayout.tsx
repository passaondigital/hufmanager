import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Menu, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConnectionStatus } from "@/components/offline/ConnectionStatus";
import { SpeedDialFAB } from "./SpeedDialFAB";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { FeierabendWaechter } from "@/components/tracking/FeierabendWaechter";
import { DemoStickyBanner } from "@/components/demo/DemoStickyBanner";
import { useDemoActivityTracker } from "@/hooks/useDemoActivityTracker";

export function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Initialize demo activity tracker for automatic page view tracking
  useDemoActivityTracker();

  return (
    <div className="min-h-screen flex w-full bg-background">
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

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <header className="lg:hidden h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3">
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

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Speed Dial FAB - unified action menu */}
      <SpeedDialFAB />
      
      {/* Demo Account Sticky Banner */}
      <DemoStickyBanner />
    </div>
  );
}
