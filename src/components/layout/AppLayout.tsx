import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { HelpCenterFAB } from "@/components/help";

export function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
        <header className="lg:hidden h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="h-11 w-11"
              aria-label="Menü öffnen"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <img 
              src="/hufmanager-logo.png" 
              alt="HufManager" 
              className="h-8 w-auto"
            />
          </div>
          
          {/* Mobile Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10"
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

        {/* Desktop Header - hidden on mobile */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Feedback Widget for bug reporting */}
      <FeedbackWidget />
      
      {/* Help Center FAB */}
      <HelpCenterFAB currentRoute={location.pathname} />
    </div>
  );
}
