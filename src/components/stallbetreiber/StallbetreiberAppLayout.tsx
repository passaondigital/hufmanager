import { useState } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Home, Calendar, Heart, MessageSquare, User,
  Menu, Sun, Moon, Search, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DemoStickyBanner } from "@/components/demo";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AppHeader } from "@/components/layout/AppHeader";
import { SpeedDialFAB } from "@/components/layout/SpeedDialFAB";
import { SystemAnnouncementBanner } from "@/components/announcements/SystemAnnouncementBanner";
import {
  Sheet as QuickSheet,
  SheetContent as QuickSheetContent,
  SheetHeader as QuickSheetHeader,
  SheetTitle as QuickSheetTitle,
} from "@/components/ui/sheet";

// ── Read stall type from sessionStorage ──
function getStallType(): string {
  return sessionStorage.getItem("hm_demo_stall_type") || "pension";
}

function getStallTypeLabel(): string {
  const labels: Record<string, string> = {
    pension: "Pensionsbetrieb",
    schule: "Schulbetrieb",
    misch: "Mischbetrieb",
    zucht: "Zuchtbetrieb",
  };
  return labels[getStallType()] || "Stallbetrieb";
}

// ── Navigation Config ──
const STALL_NAV: NavigationConfig = {
  directItems: [
    { id: "dashboard", label: "Dashboard", iconName: "LayoutDashboard", path: "/stall/dashboard" },
  ],
  groups: [
    {
      label: "Die 5 A's",
      items: [
        {
          id: "anfragen", number: "1", label: "Anfragen", iconName: "MessageSquare",
          children: [
            { label: "Anfragen & Leads", path: "/stall/anfragen" },
            { label: "Buchungsportal", path: "/stall/buchungsportal" },
          ],
        },
        {
          id: "angebote", number: "2", label: "Angebote", iconName: "FileText",
          children: [
            { label: "Verträge & Angebote", path: "/stall/angebote" },
            { label: "Leistungskatalog", path: "/stall/leistungen" },
          ],
        },
        {
          id: "aufnahme", number: "3", label: "Aufnahme", iconName: "UserPlus",
          children: [
            { label: "Einsteller", path: "/stall/boarders" },
            { label: "Pferde", path: "/stall/pferde" },
            { label: "Stallübersicht", path: "/stall/overview" },
          ],
        },
        {
          id: "auffassen", number: "4", label: "Auffassen", iconName: "Calendar",
          children: [
            { label: "Tages-Cockpit", path: "/stall/home" },
            { label: "Kalender", path: "/stall/kalender" },
            { label: "Mitarbeiter", path: "/stall/staff" },
            { label: "Lager & Futter", path: "/stall/lager" },
          ],
        },
        {
          id: "analyse", number: "5", label: "Analyse", iconName: "BarChart3",
          children: [
            { label: "Rechnungen", path: "/stall/rechnungen" },
            { label: "Betriebsübersicht", path: "/stall/betrieb" },
            { label: "Berichte & Behörden", path: "/stall/reports" },
          ],
        },
      ],
    },
    {
      label: "Erweiterungen",
      items: [
        { id: "experts", label: "Stall-Experten", iconName: "Award", path: "/stall/experts" },
        { id: "connect", label: "HM Connect", iconName: "Link2", path: "/stall/connect" },
        { id: "chat", label: "Nachrichten", iconName: "MessageSquare", path: "/stall/chat" },
        { id: "marketplace", label: "Pferdemarkt", iconName: "Store", path: "/stall/marketplace" },
      ],
    },
    {
      label: "Management",
      items: [
        { id: "import", label: "Import Center", iconName: "Upload", path: "/stall/import" },
        { id: "settings", label: "Stall-Einstellungen", iconName: "Settings", path: "/stall/settings" },
        { id: "profil", label: "Mein Profil", iconName: "User", path: "/stall/profil" },
        { id: "support", label: "Hilfe & Support", iconName: "LifeBuoy", path: "/stall/support" },
      ],
    },
  ],
};

const BOTTOM_NAV_ITEMS = [
  { Icon: Home, label: "Home", path: "/stall/dashboard" },
  { Icon: Calendar, label: "Kalender", path: "/stall/kalender" },
  { Icon: Heart, label: "Pferde", path: "/stall/pferde" },
  { Icon: MessageSquare, label: "Chat", path: "/stall/chat" },
  { Icon: User, label: "Profil", path: "/stall/profil" },
];

const quickActions = [
  { label: "Neuer Einsteller", path: "/stall/boarders", icon: User },
  { label: "Neues Pferd", path: "/stall/pferde", icon: Heart },
  { label: "Neuer Termin", path: "/stall/kalender", icon: Calendar },
];

export function StallbetreiberAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isActive = (path: string) => {
    if (path === "/stall/dashboard") return location.pathname === "/stall/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] flex w-full bg-background overflow-safe">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          appName={`🏇 ${getStallTypeLabel()}`}
          userDisplayName={user?.email || "Stallbetreiber"}
          navigationConfig={STALL_NAV}
        />
      </div>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <MobileAppSidebar
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            appName={`🏇 ${getStallTypeLabel()}`}
            userDisplayName={user?.email || "Stallbetreiber"}
            navigationConfig={STALL_NAV}
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
            <span className="text-sm font-semibold text-foreground">🏇 {getStallTypeLabel()}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(true)} className="h-10 w-10 min-w-[40px]" aria-label="Suchen">
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10 min-w-[40px]" aria-label="Theme wechseln">
              {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </Button>
            <NotificationBell />
          </div>
        </header>

        {/* Mobile GlobalSearch */}
        <GlobalSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* System Announcements */}
        <SystemAnnouncementBanner />

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 py-4 lg:p-6 pb-bottom-nav overflow-x-hidden">
          <ErrorBoundary name="StallbetreiberApp">
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
          {BOTTOM_NAV_ITEMS.slice(0, 2).map((item) => (
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

          {BOTTOM_NAV_ITEMS.slice(2).map((item) => (
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
        {/* SpeedDialFAB entfernt */}
      </div>

      <DemoStickyBanner />
      <AIChatWidget />
    </div>
  );
}
