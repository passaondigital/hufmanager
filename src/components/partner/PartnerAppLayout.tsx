import { useState, useMemo } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Home, Heart, FileText, MessageSquare, User, Menu, LogOut, Sun, Moon,
  ChevronRight, Calendar, Upload, ClipboardList, Receipt, Briefcase,
  Settings, BarChart3, Map as MapIcon, GraduationCap, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { FeatureKey } from "@/types/featureFlags";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  /** If set, item is only visible when this feature is accessible */
  featureKey?: FeatureKey;
  /** Show in bottom nav on mobile */
  bottomNav?: boolean;
}

// All possible navigation items – visibility controlled by feature flags
const ALL_NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Übersicht", path: "/partner-home", bottomNav: true },
  { icon: Calendar, label: "Kalender", path: "/partner-calendar", featureKey: "module_invoicing", bottomNav: true },
  { icon: Heart, label: "Meine Pferde", path: "/partner-horses", bottomNav: true },
  { icon: FileText, label: "Behandlungsnotizen", path: "/partner-notes" },
  { icon: ClipboardList, label: "Behandlungspläne", path: "/partner-plans" },
  { icon: Upload, label: "Dokumente & Befunde", path: "/partner-documents" },
  { icon: Briefcase, label: "Leistungskatalog", path: "/partner-services", featureKey: "module_invoicing" },
  { icon: Receipt, label: "Rechnungen", path: "/partner-invoices", featureKey: "module_invoicing" },
  { icon: MessageSquare, label: "Chat", path: "/partner-chat", featureKey: "module_chat", bottomNav: true },
  { icon: AlertTriangle, label: "Notfall", path: "/partner-notfall" },
  { icon: MapIcon, label: "Karte / Navigation", path: "/partner-maps", featureKey: "module_maps" },
  { icon: BarChart3, label: "Analytics", path: "/partner-analytics", featureKey: "module_analytics" },
  { icon: GraduationCap, label: "Academy", path: "/partner-academy", featureKey: "module_academy" },
  { icon: Settings, label: "Einstellungen", path: "/partner-settings" },
  { icon: User, label: "Profil", path: "/partner-profile", bottomNav: true },
];

export function PartnerAppLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isFeatureVisible, showBetaBadge } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);

  // Filter nav items based on feature flags
  const visibleNavItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => {
      if (!item.featureKey) return true;
      return isFeatureVisible(item.featureKey);
    });
  }, [isFeatureVisible]);

  const bottomNavItems = useMemo(() => {
    return visibleNavItems.filter(item => item.bottomNav).slice(0, 5);
  }, [visibleNavItems]);

  const sidebarItems = useMemo(() => {
    return visibleNavItems;
  }, [visibleNavItems]);

  const isActive = (path: string) => {
    if (path === "/partner-home") return location.pathname === "/partner-home";
    return location.pathname.startsWith(path);
  };

  const getInitials = (email?: string) => {
    if (!email) return "P";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
          {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
        </Button>
      </header>

      {/* Mobile Sidebar */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(user?.email || undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user?.email}</p>
                <Badge variant="secondary" className="text-xs">Fachpartner</Badge>
              </div>
            </div>
          </div>
          <nav className="p-2 space-y-1 overflow-auto max-h-[calc(100vh-12rem)]">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.featureKey && showBetaBadge(item.featureKey) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Beta</Badge>
                )}
              </NavLink>
            ))}
          </nav>
          <Separator className="my-2" />
          <div className="p-2">
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Abmelden</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-60 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(user?.email || undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">PartnerApp</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-auto">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.featureKey && showBetaBadge(item.featureKey) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Beta</Badge>
                )}
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </NavLink>
            ))}
          </nav>
          <div className="p-2 border-t border-border">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Abmelden</span>
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Content */}
      <main className="flex-1 overflow-auto p-4 pb-24 lg:hidden">
        <Outlet />
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
              <item.icon className={cn("h-5 w-5 mb-1 transition-transform", isActive(item.path) && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
