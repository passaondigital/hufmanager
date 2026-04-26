import { useState } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useEmployeeOffline } from "@/hooks/useEmployeeOffline";
import {
  Home, Route, Camera, Notebook, User, Menu, Sun, Moon,
  Search, Zap, Settings, Plus, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmployeeNotificationBell } from "@/components/employee/EmployeeNotificationBell";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { useLogout } from "@/hooks/useLogout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { ConnectionStatus } from "@/components/offline/ConnectionStatus";
import { SpeedDialFAB } from "@/components/layout/SpeedDialFAB";
import { DemoStickyBanner } from "@/components/demo";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { FeierabendWaechter } from "@/components/tracking/FeierabendWaechter";
import { useAutoflowMode, AutoflowMode } from "@/hooks/useAutoflowMode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet as QuickSheet,
  SheetContent as QuickSheetContent,
  SheetHeader as QuickSheetHeader,
  SheetTitle as QuickSheetTitle,
} from "@/components/ui/sheet";

const getEmployeeNav = (permissions: Record<string, boolean>): NavigationConfig => {
  const tourChildren = [];
  if (permissions.can_use_tour_manager || permissions.can_use_maps) {
    tourChildren.push({ label: "Meine Tour", path: "/employee/tour" });
  }
  tourChildren.push({ label: "Kalender", path: "/employee/kalender" });

  return {
    directItems: [
      { id: "dashboard", label: "Dashboard", iconName: "Home", path: "/employee" },
    ],
    groups: [
      {
        label: "Mein Arbeitstag",
        items: [
          {
            id: "tours", number: "1", label: "Touren & Termine", iconName: "Route",
            children: tourChildren,
          },
          {
            id: "documentation", number: "2", label: "Dokumentation", iconName: "Camera",
            children: [
              { label: "HufCam Pro", path: "/employee/hufcam" },
              { label: "Hufanalyse", path: "/employee/analyse" },
            ],
          },
          {
            id: "tracking", number: "3", label: "Zeit & Tracking", iconName: "Clock",
            children: [
              { label: "Zeiterfassung", path: "/employee/timer" },
            ],
          },
        ],
      },
      {
        label: "Kommunikation",
        items: [
          {
            id: "chat", label: "Chat", iconName: "MessageSquare",
            children: [
              { label: "Chat", path: "/employee/chat" },
            ],
          },
          { id: "connect", label: "HM Connect", iconName: "Link2", path: "/employee/connect" },
        ],
      },
      {
        label: "Verwaltung",
        items: [
          { id: "horses", label: "Pferde", iconName: "Heart", path: "/employee/pferde" },
          { id: "material", label: "Material", iconName: "Package", path: "/employee/material" },
          { id: "absence", label: "Abwesenheiten", iconName: "CalendarOff", path: "/employee/abwesenheiten" },
          { id: "contract", label: "Vertrag", iconName: "FileText", path: "/employee/vertrag" },
          
          { id: "notebook", label: "Mein Notizbuch", iconName: "Notebook", path: "/employee/notizbuch" },
        ],
      },
      {
        label: "Konto",
        items: [
          { id: "profile", label: "Profil", iconName: "User", path: "/employee/profil" },
          { id: "management", label: "Management", iconName: "Settings", path: "/employee/management" },
          { id: "support", label: "Hilfe & Support", iconName: "LifeBuoy", path: "/employee/support" },
        ],
      },
    ],
  };
};

const getBottomNavItems = (permissions: Record<string, boolean>) => {
  const items = [
    { Icon: Home, label: "Home", path: "/employee" },
  ];
  if (permissions.can_use_tour_manager || permissions.can_use_maps) {
    items.push({ Icon: Route, label: "Tour", path: "/employee/tour" });
  }
  items.push(
    { Icon: Camera, label: "HufCam", path: "/employee/hufcam" },
    { Icon: Notebook, label: "Notizbuch", path: "/employee/notizbuch" },
    { Icon: User, label: "Profil", path: "/employee/profil" },
  );
  return items;
};

const quickActions = [
  { label: "Meine Tour", path: "/employee/tour", icon: Route },
  { label: "HufCam Pro", path: "/employee/hufcam", icon: Camera },
  { label: "Zeiterfassung", path: "/employee/timer", icon: Calendar },
];

export function EmployeeAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: profile, isLoading } = useEmployeeProfile();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { isOnline, pendingCount } = useEmployeeOffline();
  const { mode, updateMode, loading: autoflowLoading, MODE_LABELS } = useAutoflowMode();

  const modeColors: Record<AutoflowMode, string> = {
    basis: "text-blue-500",
    plus: "text-amber-500",
    premium: "text-emerald-500",
  };

  const isActive = (path: string) => {
    if (path === "/employee") return location.pathname === "/employee";
    return location.pathname.startsWith(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Kein Mitarbeiterprofil</h2>
          <p className="text-muted-foreground">Dein Konto ist nicht als Mitarbeiter registriert.</p>
          <Button variant="outline" onClick={() => logout()}>Abmelden</Button>
        </div>
      </div>
    );
  }

  const customPerms = (profile.custom_permissions || {}) as Record<string, boolean>;
  const employeeNav = getEmployeeNav(customPerms);
  const bottomNavItems = getBottomNavItems(customPerms);

  return (
    <div className="min-h-[100dvh] flex w-full bg-background overflow-safe">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          appName="MitarbeiterApp"
          userDisplayName={profile.full_name}
          userAvatar={profile.avatar_url || undefined}
          navigationConfig={employeeNav}
        />
      </div>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <MobileAppSidebar
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            appName="MitarbeiterApp"
            userDisplayName={profile.full_name}
            userAvatar={profile.avatar_url || undefined}
            navigationConfig={employeeNav}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-x-hidden lg:ml-64">
        {/* Mobile Header */}
        <header
          className="lg:hidden h-14 max-h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="h-10 w-10" aria-label="Menü öffnen">
              <Menu className="h-5 w-5" />
            </Button>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" alt="Hufi" className="h-7 w-auto" />
          </div>

          <div className="flex items-center gap-1">
            <ConnectionStatus />

            {/* AutoFlow Quick Toggle */}
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
                <DropdownMenuItem onClick={() => navigate("/employee")} className="h-10 cursor-pointer text-xs text-muted-foreground">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  AutoFlow Info
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(true)} className="h-10 w-10 min-w-[40px]" aria-label="Suchen">
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>

            <FeierabendWaechter />

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10 min-w-[40px]" aria-label="Theme wechseln">
              {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </Button>

            <EmployeeNotificationBell />
          </div>
        </header>

        {/* Mobile GlobalSearch */}
        <GlobalSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* Offline Banner */}
        <OfflineBanner />

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 py-4 lg:p-6 pb-bottom-nav overflow-x-hidden">
          <ErrorBoundary name="EmployeeApp">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-[72px] px-1">
          {bottomNavItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.Icon className={cn("h-7 w-7 mb-1 transition-transform", isActive(item.path) && "scale-110")} />
              <span className={cn("text-xs font-medium", isActive(item.path) && "font-bold")}>{item.label}</span>
            </NavLink>
          ))}

          {/* Center Plus Button */}
          <button onClick={() => setShowQuickActions(true)} className="flex items-center justify-center -mt-6 z-10">
            <div className="w-16 h-16 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary-foreground" />
            </div>
          </button>

          {bottomNavItems.slice(2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.Icon className={cn("h-7 w-7 mb-1 transition-transform", isActive(item.path) && "scale-110")} />
              <span className={cn("text-xs font-medium", isActive(item.path) && "font-bold")}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Actions Sheet */}
      <QuickSheet open={showQuickActions} onOpenChange={setShowQuickActions}>
        <QuickSheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <QuickSheetHeader className="pb-4">
            <QuickSheetTitle className="text-center">Schnell-Aktionen</QuickSheetTitle>
          </QuickSheetHeader>
          <div className="grid grid-cols-3 gap-3 pb-4">
            {quickActions.map((action) => (
              <NavLink
                key={action.label}
                to={action.path}
                onClick={() => setShowQuickActions(false)}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <action.icon className="h-6 w-6 text-primary mb-2" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </NavLink>
            ))}
          </div>
          <Button variant="ghost" className="w-full h-12" onClick={() => setShowQuickActions(false)}>
            Abbrechen
          </Button>
        </QuickSheetContent>
      </QuickSheet>

      {/* Speed Dial FAB - Desktop */}
      <div className="hidden lg:block">
        <SpeedDialFAB />
      </div>

      <DemoStickyBanner />
      <AIChatWidget />
    </div>
  );
}