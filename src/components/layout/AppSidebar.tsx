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
  Link2,
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
  Map,
  Wallet,
  Scale,
  Zap,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UsageMeter } from "@/components/subscription/UsageMeter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Stealth feature: Only these emails can see Abo-Matrix
const STEALTH_EMAILS = ["support@hufmanager.de"];

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

// Hook to get count of unread messages (only messages where I am recipient)
function useUnreadMessagesCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      // 1. Get all conversations where user is participant
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`);
      
      if (convError || !conversations?.length) return 0;
      
      const conversationIds = conversations.map(c => c.id);
      
      // 2. Count unread messages in these conversations where I am NOT the sender
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
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
  isBeta?: boolean;
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
  const { isFeatureVisible } = useSubscription();
  
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
      ]
    },
    { 
      number: 2, 
      title: "Angebote", 
      icon: FileText,
      subItems: [
        { title: "Mein Angebot", url: "/mein-angebot", icon: ShoppingBag, description: "Leistungen, Preise & Gruppen" },
        { title: "Offene Angebote", url: "/angebote", icon: ClipboardList, description: "Kostenvoranschläge" },
      ]
    },
    { 
      number: 3, 
      title: "Aufnahme", 
      icon: UserPlus,
      subItems: [
        { title: "Kunden", url: "/kunden", icon: Users, description: "#kid verwalten" },
        { title: "Pferde", url: "/pferde", icon: UserPlus, description: "#eqid verwalten" },
      ]
    },
    { 
      number: 4, 
      title: "Auffassen", 
      icon: Calendar,
      subItems: [
        { title: "Kalender", url: "/kalender", icon: Calendar, description: "Termine planen" },
        { title: "Tages-Cockpit", url: "/tour", icon: Calendar, description: "Tour · Zeit · km · Sprit" },
        { title: "HufCam Pro", url: "/work-mode?tab=hufcam", icon: Camera, description: "Foto-Dokumentation" },
        { title: "Hufanalyse", url: "/work-mode?tab=analyse", icon: FileCheck, description: "LTZ-Analyse-Bögen" },
        { title: "Feedback", url: "/auffassen/feedback", icon: Star, description: "Bewertungen sammeln" },
      ]
    },
    { 
      number: 5, 
      title: "Analyse", 
      icon: BarChart3,
      subItems: [
        { title: "Rechnungen", url: "/rechnungen", icon: Receipt, description: "Rechnungen & Export" },
        { title: "Ausgaben & Belege", url: "/ausgaben", icon: Wallet, description: "Kosten & Belege scannen" },
        { title: "Fuhrpark", url: "/fuhrpark", icon: Car, description: "Fahrzeuge & Tankbuch" },
        { title: "Buchhaltung", url: "/buchhaltung", icon: FileText, description: "EÜR, USt-VA, DATEV & StB" },
        { title: "GuV-Übersicht", url: "/guv", icon: Scale, description: "Gewinn- & Verlustrechnung" },
        { title: "Betriebszahlen", url: "/analyse/betriebszahlen", icon: TrendingUp, description: "Charts & Stats" },
      ]
    },
  ];

  // Erweiterungen - Addon modules (locked based on feature flags)
  const addonItems = [
    { title: "Mein Office", icon: FileText, locked: !isFeatureVisible('module_office'), url: "/mein-office" },
    { title: "Lager", icon: Warehouse, locked: !isFeatureVisible('beta_features'), url: "/lager" },
    { title: "Mitarbeiter", icon: UsersRound, locked: !isFeatureVisible('module_team'), url: "/team" },
    { title: "HM Connect", icon: Link2, locked: !isFeatureVisible('module_network'), url: "/hm-connect" },
    { title: "AutoFlow", icon: Zap, locked: false, url: "/autoflow" },
    { title: "E-Mail Marketing", icon: Package, locked: false, url: "/email-marketing" },
  ];

  // Check if a submenu contains the active route
  const isMenuActive = (item: MainMenuItem) => {
    return item.subItems.some(sub => location.pathname === sub.url || location.pathname.startsWith(sub.url.split("?")[0]));
  };

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  // Check if any management route is active
  const isManagementActive = () => {
    return (
      (isActive("/management") && (location.search.includes("profile") || location.search.includes("subscription"))) ||
      isActive("/ausgaben") ||
      isActive("/notfall")
    );
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
      {item.isBeta && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-orange-500/30">
          Beta
        </Badge>
      )}
      {item.badge !== undefined && item.badge > 0 && (
        <span className={cn(
          "bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
          !item.isBeta && "ml-auto"
        )}>
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

  // Addon item (locked or unlocked based on feature flags)
  const AddonItem = ({ item }: { item: { title: string; icon: React.ComponentType<{ className?: string }>; locked: boolean; url: string } }) => {
    if (item.locked) {
      return (
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
    }
    
    // Unlocked - show as regular navigation item
    return (
      <NavLink
        to={item.url}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
          isActive(item.url)
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
        {!collapsed && <span className="font-medium text-[15px]">{item.title}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border",
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
            aria-label={collapsed ? "Sidebar aufklappen" : "Sidebar einklappen"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Dashboard Quick Access */}
        <div className="px-3 mb-2">
          <NavLink
            to="/home"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              isActive("/home")
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
            <AddonItem key={item.title} item={item} />
          ))}
          
          {/* Usage Meter */}
          <UsageMeter collapsed={collapsed} />
        </div>
      </ScrollArea>

      {/* Bottom Section - MANAGEMENT (kompakt) */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        {/* Stealth: Abo-Matrix */}
        {canSeeAboMatrix && (
          <NavLink
            to="/abo-matrix"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
              isActive("/abo-matrix")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-accent-foreground hover:bg-sidebar-accent"
            )}
          >
            <Diamond className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="text-sm">Abo-Matrix</span>}
          </NavLink>
        )}

        {/* Admin Link removed - access only via Auth page rocket icon */}

        {/* Management - Single Link */}
        <NavLink
          to="/management"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
            isActive("/management")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm font-medium">Management</span>}
        </NavLink>

        {/* Hilfe & Support + Logout - außerhalb von Management */}
        <div className="space-y-0.5 pt-1">
          <NavLink
            to="/support"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
              isActive("/support")
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LifeBuoy className={cn("h-3.5 w-3.5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="text-xs">Hilfe & Support</span>}
          </NavLink>

          <PWAInstallButton collapsed={collapsed} />
          
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
              "text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className={cn("h-3.5 w-3.5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="text-xs">Abmelden</span>}
          </button>
        </div>

        {/* Legal Links - ganz kompakt */}
        {!collapsed && (
          <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-sidebar-foreground/40">
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
        )}
      </div>
    </aside>
  );
}
