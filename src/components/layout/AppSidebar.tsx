import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  UserPlus,
  Star,
  BarChart3,
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  GraduationCap,
  Gift,
  LifeBuoy,
  Shield,
  Diamond,
  Lock,
  Warehouse,
  UsersRound,
  Package,
  Inbox,
  Clock,
  Globe,
  ShoppingBag,
  ClipboardList,
  User,
  Car,
  CreditCard,
  Receipt,
  TrendingUp,
  Camera,
  FileCheck,
  Timer,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Stealth feature: Only these emails can see Abo-Matrix
const STEALTH_EMAILS = ["barhufserviceschmid@gmail.com"];

// Hook to get count of new leads
function useNewLeadsCount() {
  return useQuery({
    queryKey: ["new-leads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "neu");
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
}

// Hook to get count of unread messages
function useUnreadMessagesCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user.id);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
    enabled: !!user,
  });
}

interface SubMenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

interface MainMenuItem {
  number: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  subItems: SubMenuItem[];
}

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: newLeadsCount = 0 } = useNewLeadsCount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { role, user } = useAuth();
  
  const isAdmin = role === "admin";
  const canSeeAboMatrix = user?.email && STEALTH_EMAILS.includes(user.email);

  // Track which menus are open
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});

  // Die 5 A's - Neue Struktur mit Untermenüs
  const fiveAsItems: MainMenuItem[] = [
    { 
      number: 1,
      title: "Anfragen", 
      icon: MessageSquare, 
      badge: (newLeadsCount || 0) + (unreadMessagesCount || 0),
      subItems: [
        { title: "Inbox", url: "/chat", icon: Inbox, badge: unreadMessagesCount || undefined, description: "Nachrichten & Chat" },
        { title: "Warteliste", url: "/anfragen", icon: Clock, badge: newLeadsCount || undefined, description: "Potenzielle Kunden" },
        { title: "Landingpage", url: "/management?tab=landing", icon: Globe, description: "Öffentliche Visitenkarte" },
      ]
    },
    { 
      number: 2, 
      title: "Angebote", 
      icon: FileText,
      subItems: [
        { title: "Service-Katalog", url: "/services", icon: ShoppingBag, description: "Leistungen definieren" },
        { title: "Offene Angebote", url: "/angebote", icon: ClipboardList, description: "Kostenvoranschläge" },
      ]
    },
    { 
      number: 3, 
      title: "Aufnahme", 
      icon: UserPlus,
      subItems: [
        { title: "Kunden", url: "/kunden", icon: Users, description: "#kid verwalten" },
        { title: "Pferde", url: "/aufnahme", icon: UserPlus, description: "#eqid verwalten" },
      ]
    },
    { 
      number: 4, 
      title: "Auffassen", 
      icon: Calendar,
      subItems: [
        { title: "Kalender & Tour", url: "/kalender", icon: Route, description: "Termine & Routen" },
        { title: "Work-Mode", url: "/hufanalyse", icon: Camera, description: "HufCam & Tools" },
        { title: "Feedback", url: "/auffassen", icon: Star, description: "Bewertungen" },
      ]
    },
    { 
      number: 5, 
      title: "Analyse", 
      icon: BarChart3,
      subItems: [
        { title: "Finanzen", url: "/rechnungen", icon: Receipt, description: "Rechnungen & Export" },
        { title: "Betriebszahlen", url: "/analyse", icon: TrendingUp, description: "Charts & Stats" },
      ]
    },
  ];

  // Erweiterungen - Locked Add-ons
  const addonItems = [
    { title: "Lager", icon: Warehouse, locked: true },
    { title: "Mitarbeiter", icon: UsersRound, locked: true },
  ];

  // Check if a submenu contains the active route
  const isMenuActive = (item: MainMenuItem) => {
    return item.subItems.some(sub => location.pathname === sub.url || location.pathname.startsWith(sub.url.split("?")[0]));
  };

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  const toggleMenu = (number: number) => {
    setOpenMenus(prev => ({ ...prev, [number]: !prev[number] }));
  };

  const handleLockedClick = (featureName: string) => {
    toast({
      title: "Erweiterung gesperrt",
      description: `${featureName} ist ein kostenpflichtiges Add-on. Upgrade auf Pro für alle Features.`,
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Abgemeldet", description: "Bis bald!" });
      navigate("/auth");
    } catch (error) {
      toast({ title: "Fehler", description: "Abmeldung fehlgeschlagen.", variant: "destructive" });
    }
  };

  // Sub-menu item component
  const SubNavItem = ({ item }: { item: SubMenuItem }) => (
    <NavLink
      to={item.url}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-8 min-h-[40px]",
        isActive(item.url)
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{item.title}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {item.badge}
        </span>
      )}
    </NavLink>
  );

  // Main menu item with collapsible sub-items
  const MainNavItem = ({ item }: { item: MainMenuItem }) => {
    const isOpen = openMenus[item.number] ?? isMenuActive(item);
    const menuActive = isMenuActive(item);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleMenu(item.number)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              menuActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            {/* Nummer-Badge */}
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0",
              menuActive
                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {item.number}
            </div>
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors",
              collapsed && "mx-auto"
            )} />
            {!collapsed && (
              <>
                <span className="font-medium text-[15px] flex-1 text-left">{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center mr-2">
                    {item.badge}
                  </span>
                )}
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </>
            )}
          </button>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent className="space-y-1 pt-1">
            {item.subItems.map((sub) => (
              <SubNavItem key={sub.url} item={sub} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  // Locked addon item
  const LockedAddonItem = ({ item }: { item: { title: string; icon: React.ComponentType<{ className?: string }>; locked: boolean } }) => (
    <button
      onClick={() => handleLockedClick(item.title)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
        "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 cursor-not-allowed"
      )}
    >
      <item.icon className={cn("h-5 w-5 flex-shrink-0 opacity-50", collapsed && "mx-auto")} />
      {!collapsed && (
        <>
          <span className="font-medium text-[15px] opacity-50">{item.title}</span>
          <Lock className="ml-auto h-4 w-4 opacity-50" />
        </>
      )}
    </button>
  );

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed ? (
          <img 
            src="/hufmanager-logo.png" 
            alt="HufManager" 
            className="h-10 w-auto"
          />
        ) : (
          <img 
            src="/hufmanager-logo.png" 
            alt="HM" 
            className="h-8 w-auto"
          />
        )}
        <div className="flex items-center gap-1">
          <NotificationBell collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Dashboard Quick Access */}
        <div className="px-3 mb-2">
          <NavLink
            to="/"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              isActive("/") && location.pathname === "/"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LayoutDashboard className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Dashboard</span>}
          </NavLink>
        </div>

        <Separator className="my-4 bg-sidebar-border" />

        {/* Die 5 A's - Core Workflow */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-primary uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Die 5 A's
            </p>
          )}
          {fiveAsItems.map((item) => (
            <MainNavItem key={item.number} item={item} />
          ))}
        </div>

        <Separator className="my-4 bg-sidebar-border" />

        {/* Erweiterungen - Locked Add-ons */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Package className="h-3 w-3" />
              Erweiterungen
            </p>
          )}
          {addonItems.map((item) => (
            <LockedAddonItem key={item.title} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Section - MANAGEMENT */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Stealth: Abo-Matrix */}
        {canSeeAboMatrix && (
          <NavLink
            to="/abo-matrix"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              isActive("/abo-matrix")
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-sidebar-accent-foreground hover:bg-sidebar-accent"
            )}
          >
            <Diamond className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Abo-Matrix</span>}
          </NavLink>
        )}

        {/* Admin Link */}
        {isAdmin && (
          <NavLink
            to="/admin/mission-control"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              isActive("/admin/mission-control")
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-sidebar-accent-foreground hover:bg-sidebar-accent"
            )}
          >
            <Shield className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Mission Control</span>}
          </NavLink>
        )}

        {/* Management Section */}
        {!collapsed && (
          <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2 flex items-center gap-2">
            <Settings className="h-3 w-3" />
            Management
          </p>
        )}
        
        <NavLink
          to="/management?tab=profile"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]",
            isActive("/management") && location.search.includes("profile")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <User className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Profil</span>}
        </NavLink>

        <NavLink
          to="/ausgaben"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]",
            isActive("/ausgaben")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Car className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Fahrzeug & Ausgaben</span>}
        </NavLink>

        <NavLink
          to="/management?tab=subscription"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]",
            isActive("/management") && location.search.includes("subscription")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <CreditCard className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Abo & Module</span>}
        </NavLink>

        <Separator className="my-2 bg-sidebar-border" />

        {/* Support */}
        <NavLink
          to="/support"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]",
            isActive("/support")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <LifeBuoy className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Hilfe & Support</span>}
        </NavLink>

        <PWAInstallButton collapsed={collapsed} />
        
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]",
            "text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Abmelden</span>}
        </button>

        <Separator className="my-2 bg-sidebar-border" />

        {/* Legal Links */}
        {!collapsed ? (
          <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-1 text-xs text-sidebar-foreground/50">
            <a 
              href="https://hufmanager.de/impressum" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-sidebar-foreground hover:underline"
            >
              Impressum
            </a>
            <span>·</span>
            <a 
              href="https://hufmanager.de/datenschutz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-sidebar-foreground hover:underline"
            >
              Datenschutz
            </a>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
