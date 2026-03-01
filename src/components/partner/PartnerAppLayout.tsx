import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerOffline } from "@/hooks/usePartnerOffline";
import {
  Home, Calendar, Heart, MessageSquare, User,
  Menu, Sun, Moon, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

const PARTNER_NAV: NavigationConfig = {
  directItems: [
    { id: "overview", label: "Übersicht", iconName: "Home", path: "/partner-home" },
  ],
  groups: [
    {
      label: "Meine Arbeit",
      items: [
        {
          id: "horses", number: "1", label: "Pferde & Patienten", iconName: "Heart",
          children: [
            { label: "Meine Pferde", path: "/partner-horses" },
            { label: "Behandlungspläne", path: "/partner-plans" },
            { label: "Befunde & Notizen", path: "/partner-notes" },
          ],
        },
        {
          id: "appointments", number: "2", label: "Termine", iconName: "Calendar",
          children: [
            { label: "Kalender", path: "/partner-calendar" },
          ],
        },
        {
          id: "finance", number: "3", label: "Finanzen", iconName: "Receipt",
          children: [
            { label: "Rechnungen", path: "/partner-invoices" },
            { label: "Mein Angebot", path: "/partner-services" },
          ],
        },
        {
          id: "communication", number: "4", label: "Kommunikation", iconName: "MessageSquare",
          children: [
            { label: "Chat", path: "/partner-chat" },
            { label: "1. Hilfe Kunden Center", path: "/partner-notfall" },
          ],
        },
      ],
    },
    {
      label: "Präsenz",
      items: [
        { id: "website", label: "Meine Website", iconName: "Globe", path: "/partner-website" },
        { id: "network", label: "Netzwerk", iconName: "Users", path: "/partner-connect" },
        { id: "documents", label: "Dokumente & Befunde", iconName: "Upload", path: "/partner-documents" },
      ],
    },
    {
      label: "Konto",
      items: [
        {
          id: "settings", label: "Einstellungen", iconName: "Settings",
          children: [
            { label: "Einstellungen", path: "/partner-settings" },
          ],
        },
        { id: "profile", label: "Profil", iconName: "User", path: "/partner-profile" },
      ],
    },
  ],
};

const BOTTOM_NAV_ITEMS = [
  { Icon: Home, label: "Übersicht", path: "/partner-home" },
  { Icon: Calendar, label: "Kalender", path: "/partner-calendar" },
  { Icon: Heart, label: "Pferde", path: "/partner-horses" },
  { Icon: MessageSquare, label: "Chat", path: "/partner-chat" },
  { Icon: User, label: "Profil", path: "/partner-profile" },
];

export function PartnerAppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, pendingCount } = usePartnerOffline();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/partner-home") return location.pathname === "/partner-home";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-center text-xs py-2 px-4 flex items-center justify-center gap-2 z-50">
          <WifiOff className="h-3.5 w-3.5" />
          Du arbeitest offline — Notizen werden lokal gespeichert.
          {pendingCount > 0 && <span className="font-semibold">({pendingCount} ausstehend)</span>}
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
          <span className="font-semibold text-sm">PartnerApp</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileAppSidebar
        open={menuOpen}
        onOpenChange={setMenuOpen}
        appName="PartnerApp"
        userDisplayName={user?.email || "Partner"}
        navigationConfig={PARTNER_NAV}
      />

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <AppSidebar
          appName="PartnerApp"
          userDisplayName={user?.email || "Partner"}
          navigationConfig={PARTNER_NAV}
        />
        <div className="flex-1 flex flex-col ml-60">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <ErrorBoundary name="PartnerApp">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Mobile Content */}
      <main className="flex-1 overflow-auto p-4 pb-24 lg:hidden">
        <ErrorBoundary name="PartnerApp-Mobile">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {BOTTOM_NAV_ITEMS.map((item) => (
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
