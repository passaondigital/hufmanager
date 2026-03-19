import { useState } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Home, Footprints, Calendar, ClipboardList, MessageSquare,
  User, Menu, Sun, Moon, Search, Plus, Bell, Heart,
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
import { useLogout } from "@/hooks/useLogout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Download, Copy, Check, Building2, Warehouse as WarehouseIcon } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Sheet as QuickSheet,
  SheetContent as QuickSheetContent,
  SheetHeader as QuickSheetHeader,
  SheetTitle as QuickSheetTitle,
} from "@/components/ui/sheet";
import { useEffect } from "react";
import { useClientMode } from "@/hooks/useClientMode";

// ── Navigation Config (dynamic based on client mode) ──────────────────────────────────

type ClientModeType = "private" | "stall" | "commercial";

function getClientNavigationConfig(mode: ClientModeType, isVerified: boolean): NavigationConfig {
  const base: NavigationConfig = {
    directItems: [
      { id: "dashboard", label: "Dashboard", iconName: "Home", path: "/client-home" },
    ],
    groups: [
      {
        label: "Meine Pferde",
        items: [
          { id: "horses", label: "Pferde", iconName: "Heart", path: "/client-horses" },
          // Stallboard only for stall/commercial modes
          ...(mode !== "private" && isVerified
            ? [{ id: "stall", label: "Stallboard", iconName: "Warehouse", path: "/client-stall" }]
            : []),
        ],
      },
      {
        label: "Termine & Aufträge",
        items: [
          { id: "booking", label: "Buchen", iconName: "Calendar", path: "/client-booking" },
          { id: "orders", label: "Aufträge", iconName: "ClipboardList", path: "/client-orders" },
          { id: "invoices", label: "Rechnungen", iconName: "Receipt", path: "/client-invoices" },
        ],
      },
      {
        label: "Kommunikation",
        items: [
          { id: "chat", label: "Chat", iconName: "MessageSquare", path: "/client-chat" },
          { id: "notifications", label: "Benachrichtigungen", iconName: "Bell", path: "/client-notifications" },
          { id: "connect", label: "HM Connect", iconName: "Link2", path: "/client-connect" },
        ],
      },
      {
        label: "Verwaltung",
        items: [
          { id: "permissions", label: "Berechtigungen", iconName: "Shield", path: "/client-permissions" },
          { id: "locations", label: "Standorte", iconName: "MapPin", path: "/client-locations" },
          { id: "notfall", label: "Notfall", iconName: "AlertTriangle", path: "/client-notfall" },
          { id: "search-providers", label: "Experten-Verzeichnis", iconName: "Search", path: "/client/search-providers" },
          // Stall management only for stall mode
          ...(mode === "stall" && isVerified
            ? [{ id: "stall-mgmt", label: "Stallverwaltung", iconName: "Building2", path: "/client-stall-management" }]
            : []),
          // Business features for commercial mode
          ...(mode === "commercial" && isVerified
            ? [{ id: "business", label: "Gewerbeverwaltung", iconName: "Briefcase", path: "/client-business" }]
            : []),
        ],
      },
      {
        label: "Konto",
        items: [
          { id: "profile", label: "Profil", iconName: "User", path: "/client-profile" },
          { id: "account-type", label: "Account-Typ", iconName: "Settings2", path: "/client-account-type" },
          { id: "botschafter", label: "Botschafter", iconName: "Megaphone", path: "/client/botschafter" },
          { id: "support", label: "Hilfe & Support", iconName: "LifeBuoy", path: "/client-support" },
        ],
      },
    ],
  };
  return base;
}

// ── Bottom Nav Items ──────────────────────────────────

const bottomNavItems = [
  { Icon: Home, label: "Home", path: "/client-home" },
  { Icon: Footprints, label: "Pferde", path: "/client-horses", match: "/client-horse" },
  // center Plus button placeholder
  { Icon: Calendar, label: "Buchen", path: "/client-booking" },
  { Icon: ClipboardList, label: "Aufträge", path: "/client-orders" },
  { Icon: User, label: "Profil", path: "/client-profile" },
];

const quickActions = [
  { label: "Termin buchen", path: "/client-booking", icon: Calendar },
  { label: "Meine Pferde", path: "/client-horses", icon: Heart },
  { label: "Chat", path: "/client-chat", icon: MessageSquare },
];

// ── Client Header (Desktop) ──────────────────────────

function ClientDesktopHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const logout = useLogout();
  const [searchOpen, setSearchOpen] = useState(false);
  const [readableId, setReadableId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("readable_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.readable_id) setReadableId(data.readable_id);
      });
  }, [user?.id]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const copyToClipboard = () => {
    if (readableId) {
      navigator.clipboard.writeText(`#${readableId}`);
      setCopied(true);
      toast({ title: "ID kopiert!", description: `#${readableId}` });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Abgemeldet", description: "Sie wurden erfolgreich abgemeldet." });
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "PB";

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="relative flex-1 flex items-center gap-2 h-11 px-4 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Suchen...</span>
            <kbd className="pointer-events-none ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canInstall && !isInstalled && (
            <Button
              variant="outline"
              size="sm"
              onClick={promptInstall}
              className="hidden lg:flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              <span>Installieren</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-11 w-11">
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-primary" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          <NotificationBell />

          {readableId && (
            <button
              onClick={copyToClipboard}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors group"
              title="ID kopieren"
            >
              <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
                #{readableId}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              )}
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3 h-11">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground hidden sm:inline">
                  {user?.email || "Pferdebesitzer"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel className="text-foreground">Mein Konto</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => navigate("/client-profile")} className="h-11 cursor-pointer">
                <User className="mr-2 h-5 w-5" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/client-permissions")} className="h-11 cursor-pointer">
                <Settings className="mr-2 h-5 w-5" />
                Berechtigungen
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-destructive h-11 cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-5 w-5" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}

// ── Main Layout ──────────────────────────────────────

export function ClientAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { user } = useAuth();
  const { mode, modeInfo } = useClientMode();

  const displayName = user?.email?.split("@")[0] || "Pferdebesitzer";
  const clientNavigationConfig = getClientNavigationConfig(mode, modeInfo.isVerified);

  const MODE_ICONS: Record<ClientModeType, string> = {
    private: "🏠",
    stall: "🏇",
    commercial: "🏢",
  };

  const isActive = (path: string, match?: string) => {
    if (location.pathname === path) return true;
    if (match && location.pathname.startsWith(match)) return true;
    return false;
  };

  return (
    <div className="min-h-[100dvh] flex w-full bg-background overflow-safe">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          appName={`${MODE_ICONS[mode]} ${modeInfo.label}`}
          userDisplayName={displayName}
          navigationConfig={clientNavigationConfig}
        />
      </div>

      {/* Mobile Sidebar via Sheet */}
      <MobileAppSidebar
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        appName={`${MODE_ICONS[mode]} ${modeInfo.label}`}
        userDisplayName={displayName}
        navigationConfig={clientNavigationConfig}
      />

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
          <ClientDesktopHeader />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-bottom-nav overflow-x-hidden">
          <ErrorBoundary name="ClientApp">
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
                isActive(item.path, (item as any).match) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.Icon className={cn("h-7 w-7 mb-1 transition-transform", isActive(item.path, (item as any).match) && "scale-110")} />
              <span className={cn("text-xs font-medium", isActive(item.path, (item as any).match) && "font-bold")}>{item.label}</span>
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

      <DemoStickyBanner />
      <AIChatWidget />
    </div>
  );
}
