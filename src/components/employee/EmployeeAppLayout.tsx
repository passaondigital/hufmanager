import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useEmployeeOffline } from "@/hooks/useEmployeeOffline";
import {
  Home, Route, Camera, Notebook, User, Menu, Sun, Moon,
  WifiOff, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmployeeNotificationBell } from "@/components/employee/EmployeeNotificationBell";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

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
        ],
      },
      {
        label: "Verwaltung",
        items: [
          { id: "material", label: "Material", iconName: "Package", path: "/employee/material" },
          { id: "absence", label: "Abwesenheiten", iconName: "CalendarOff", path: "/employee/abwesenheiten" },
          { id: "contract", label: "Vertrag", iconName: "FileText", path: "/employee/vertrag" },
          { id: "services", label: "Leistungskatalog", iconName: "ShoppingBag", path: "/employee/angebot" },
          { id: "notebook", label: "Mein Notizbuch", iconName: "Notebook", path: "/employee/notizbuch" },
        ],
      },
      {
        label: "Konto",
        items: [
          { id: "profile", label: "Profil", iconName: "User", path: "/employee/profil" },
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

export function EmployeeAppLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile, isLoading } = useEmployeeProfile();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isOnline, pendingCount } = useEmployeeOffline();

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
          <Button variant="outline" onClick={() => signOut()}>Abmelden</Button>
        </div>
      </div>
    );
  }

  const customPerms = (profile.custom_permissions || {}) as Record<string, boolean>;
  const employeeNav = getEmployeeNav(customPerms);
  const bottomNavItems = getBottomNavItems(customPerms);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-center text-xs py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Du arbeitest offline — Dokumentation wird lokal gespeichert.</span>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="bg-accent text-accent-foreground text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{pendingCount} Einträge werden synchronisiert...</span>
        </div>
      )}

      {/* Mobile Header */}
      <header
        className="lg:hidden h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} className="h-10 w-10">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">MitarbeiterApp</span>
        </div>
        <div className="flex items-center gap-1">
          <EmployeeNotificationBell />
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileAppSidebar
        open={menuOpen}
        onOpenChange={setMenuOpen}
        appName="MitarbeiterApp"
        userDisplayName={profile.full_name}
        userAvatar={profile.avatar_url || undefined}
        navigationConfig={employeeNav}
      />

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <AppSidebar
          appName="MitarbeiterApp"
          userDisplayName={profile.full_name}
          userAvatar={profile.avatar_url || undefined}
          navigationConfig={employeeNav}
        />
        <div className="flex-1 flex flex-col ml-60">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <ErrorBoundary name="EmployeeApp">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Mobile Content */}
      <main className="flex-1 overflow-auto p-4 pb-24 lg:hidden">
        <ErrorBoundary name="EmployeeApp-Mobile">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.Icon className={cn("h-5 w-5 mb-1 transition-transform", isActive(item.path) && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <AIChatWidget />
    </div>
  );
}
