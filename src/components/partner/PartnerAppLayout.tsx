import { useState } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerOffline } from "@/hooks/usePartnerOffline";
import {
  Home, Calendar, Heart, MessageSquare, User,
  Menu, Sun, Moon, WifiOff, Search, Zap, Settings, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { ConnectionStatus } from "@/components/offline/ConnectionStatus";
import { SpeedDialFAB } from "@/components/layout/SpeedDialFAB";
import { DemoStickyBanner } from "@/components/demo";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { FeierabendWaechter } from "@/components/tracking/FeierabendWaechter";
import { TrialCountdownBanner } from "@/components/subscription/TrialCountdownBanner";
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

const PARTNER_NAV: NavigationConfig = {
  directItems: [
    { id: "dashboard", label: "Dashboard", iconName: "LayoutDashboard", path: "/partner-home" },
  ],
  groups: [
    {
      label: "Die 5 A's",
      items: [
        {
          id: "anfragen", number: "1", label: "Anfragen", iconName: "MessageSquare",
          children: [
            { label: "Inbox", path: "/partner-chat" },
            { label: "Warteliste", path: "/partner-anfragen" },
          ],
        },
        {
          id: "angebote", number: "2", label: "Angebote", iconName: "FileText",
          children: [
            { label: "Mein Angebot", path: "/partner-services" },
            { label: "Offene Angebote", path: "/partner-angebote" },
          ],
        },
        {
          id: "aufnahme", number: "3", label: "Aufnahme", iconName: "UserPlus",
          children: [
            { label: "Kunden", path: "/partner-kunden" },
            { label: "Pferde", path: "/partner-pferde" },
            { label: "Behandlungspläne", path: "/partner-plans" },
            { label: "Befunde & Notizen", path: "/partner-notes" },
            { label: "Dokumente & Befunde", path: "/partner-documents" },
          ],
        },
        {
          id: "auffassen", number: "4", label: "Auffassen", iconName: "Calendar",
          children: [
            { label: "Kalender", path: "/partner-calendar" },
            { label: "Tour Manager", path: "/partner-tour" },
            { label: "Zeit-Tracking", path: "/partner-work-mode?tab=timer" },
            { label: "km-Tracker", path: "/partner-work-mode?tab=mileage" },
            { label: "Feedback", path: "/partner-feedback" },
          ],
        },
        {
          id: "analyse", number: "5", label: "Analyse", iconName: "BarChart3",
          children: [
            { label: "Rechnungen", path: "/partner-invoices" },
            { label: "Ausgaben & Belege", path: "/partner-ausgaben" },
            { label: "Fuhrpark", path: "/partner-fuhrpark" },
            { label: "Buchhaltung", path: "/partner-buchhaltung" },
            { label: "GuV-Übersicht", path: "/partner-guv" },
            { label: "Betriebszahlen", path: "/partner-analyse" },
          ],
        },
      ],
    },
    {
      label: "Erweiterungen",
      items: [
        { id: "office", label: "Mein Office", iconName: "FileText", path: "/partner-office" },
        { id: "lager", label: "Lager & Material", iconName: "Warehouse", path: "/partner-lager" },
        { id: "connect", label: "HM Connect", iconName: "Link2", path: "/partner-connect" },
        { id: "autoflow", label: "AutoFlow", iconName: "Zap", path: "/partner-autoflow" },
      ],
    },
    {
      label: "Management",
      items: [
        { id: "management", label: "Management", iconName: "Settings", path: "/partner-management" },
        { id: "support", label: "Hilfe & Support", iconName: "LifeBuoy", path: "/partner-support" },
      ],
    },
  ],
};

const BOTTOM_NAV_ITEMS = [
  { Icon: Home, label: "Home", path: "/partner-home" },
  { Icon: Calendar, label: "Kalender", path: "/partner-calendar" },
  { Icon: Heart, label: "Pferde", path: "/partner-pferde" },
  { Icon: MessageSquare, label: "Chat", path: "/partner-chat" },
  { Icon: User, label: "Profil", path: "/partner-profile" },
];

const quickActions = [
  { label: "Neuer Termin", path: "/partner-calendar", icon: Calendar },
  { label: "Neuer Kunde", path: "/partner-kunden", icon: User },
  { label: "Neues Pferd", path: "/partner-horses", icon: Heart },
];

export function PartnerAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, pendingCount } = usePartnerOffline();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { mode, updateMode, loading: autoflowLoading, MODE_LABELS } = useAutoflowMode();

  const modeColors: Record<AutoflowMode, string> = {
    basis: "text-blue-500",
    plus: "text-amber-500",
    premium: "text-emerald-500",
  };

  const isActive = (path: string) => {
    if (path === "/partner-home") return location.pathname === "/partner-home";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] flex w-full bg-background overflow-safe">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          appName="PartnerApp"
          userDisplayName={user?.email || "Partner"}
          navigationConfig={PARTNER_NAV}
        />
      </div>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <MobileAppSidebar
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            appName="PartnerApp"
            userDisplayName={user?.email || "Partner"}
            navigationConfig={PARTNER_NAV}
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
            <img src="/hufmanager-logo.png" alt="HufManager" className="h-7 w-auto" />
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
                <DropdownMenuItem onClick={() => navigate("/partner-autoflow")} className="h-10 cursor-pointer text-xs text-muted-foreground">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  AutoFlow konfigurieren
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

            <NotificationBell />
          </div>
        </header>

        {/* Mobile GlobalSearch */}
        <GlobalSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* Trial Countdown Banner */}
        <TrialCountdownBanner />

        {/* Offline Banner */}
        <OfflineBanner />

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 py-4 lg:p-6 pb-bottom-nav overflow-x-hidden">
          <ErrorBoundary name="PartnerApp">
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
        <SpeedDialFAB />
      </div>

      <DemoStickyBanner />
      <AIChatWidget />
    </div>
  );
}