import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  FileText,
  UserPlus,
  Star,
  BarChart3,
  Calendar,
  Users,
  Settings,
  Scissors,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
  Gift,
  LifeBuoy,
  ExternalLink,
  ClipboardList,
  Briefcase,
  Shield,
  Diamond,
  Lock,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useModuleAccessTracker } from "@/hooks/useModuleAccessTracker";
import { useAuth } from "@/hooks/useAuth";

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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

type FeatureFlagKey = "module_invoicing" | "module_chat" | "module_maps" | "module_academy" | "module_hufanalyse" | "module_network" | "module_analytics" | "beta_features";

interface MainNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: FeatureFlagKey | null;
}

const baseMainItems: MainNavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: null },
  { title: "Kalender", url: "/kalender", icon: Calendar, module: null },
  { title: "Kunden", url: "/kunden", icon: Users, module: null },
  { title: "Netzwerk", url: "/netzwerk", icon: Briefcase, module: "module_network" },
  { title: "Services", url: "/services", icon: Scissors, module: null },
  { title: "Material / Lager", url: "/lager", icon: Warehouse, module: null },
  { title: "Rechnungen", url: "/rechnungen", icon: FileText, module: "module_invoicing" },
  { title: "Hufanalyse", url: "/hufanalyse", icon: ClipboardList, module: "module_hufanalyse" },
  { title: "Chat", url: "/chat", icon: MessagesSquare, module: "module_chat" },
];

interface BottomNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: FeatureFlagKey | null;
}

interface BottomNavItemWithStatus extends BottomNavItem {
  comingSoon?: boolean;
}

const bottomItems: BottomNavItemWithStatus[] = [
  { title: "Academy", url: "/academy", icon: GraduationCap, module: "module_academy", comingSoon: true },
  { title: "Geld verdienen", url: "/partner", icon: Gift, module: null },
  { title: "Management", url: "/management", icon: Settings, module: null },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

interface NavItemType {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: newLeadsCount = 0 } = useNewLeadsCount();
  const { checkAndTrackModuleAccess, hasModuleAccess } = useModuleAccessTracker();
  const { role, user } = useAuth();
  
  const isAdmin = role === "admin";
  const canSeeAboMatrix = user?.email && STEALTH_EMAILS.includes(user.email);

  // All main items with locked status
  const mainItemsWithStatus = baseMainItems.map(item => ({
    ...item,
    isLocked: item.module !== null && !hasModuleAccess(item.module),
  }));

  // Dynamic funnel items with real badge count
  const funnelItems: NavItemType[] = [
    { title: "Anfragen", url: "/anfragen", icon: MessageSquare, badge: newLeadsCount > 0 ? newLeadsCount : undefined },
    { title: "Angebote", url: "/angebote", icon: FileText },
    { title: "Aufnahme", url: "/aufnahme", icon: UserPlus },
    { title: "Auffassen", url: "/auffassen", icon: Star },
    { title: "Analyse", url: "/analyse", icon: BarChart3 },
  ];

  const handleLockedClick = (moduleName: FeatureFlagKey) => {
    checkAndTrackModuleAccess(moduleName);
    toast({
      title: "Modul nicht verfügbar",
      description: "Dieses Modul ist für deinen Account nicht aktiviert. Kontaktiere den Support.",
      variant: "destructive",
    });
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Abgemeldet", description: "Bis bald!" });
      navigate("/auth");
    } catch (error) {
      toast({ title: "Fehler", description: "Abmeldung fehlgeschlagen.", variant: "destructive" });
    }
  };

  const NavItem = ({ item, showBadge = true }: { item: NavItemType; showBadge?: boolean }) => (
    <NavLink
      to={item.url}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
        isActive(item.url)
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <item.icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors", 
        collapsed && "mx-auto",
        isActive(item.url) && "text-sidebar-primary-foreground"
      )} />
      {!collapsed && (
        <>
          <span className="font-medium text-[15px]">{item.title}</span>
          {showBadge && item.badge !== undefined && Number(item.badge) > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const LockedNavItem = ({ item }: { item: MainNavItem & { isLocked: boolean } }) => (
    <button
      onClick={() => item.module && handleLockedClick(item.module)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
        "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 cursor-not-allowed"
      )}
    >
      <item.icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors opacity-50", 
        collapsed && "mx-auto"
      )} />
      {!collapsed && (
        <>
          <span className="font-medium text-[15px] opacity-50">{item.title}</span>
          <Lock className="ml-auto h-3.5 w-3.5 opacity-50" />
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
        {/* Main Navigation */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
              Übersicht
            </p>
          )}
          {mainItemsWithStatus.map((item) => (
            item.isLocked ? (
              <LockedNavItem key={item.title} item={item} />
            ) : (
              <NavItem key={item.title} item={item} showBadge={false} />
            )
          ))}
        </div>

        <Separator className="my-4 bg-sidebar-border" />

        {/* Funnel Navigation */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
              Sales Funnel
            </p>
          )}
          {funnelItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Stealth: Abo-Matrix - only visible to specific emails */}
        {canSeeAboMatrix && (
          <NavLink
            to="/abo-matrix"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
              isActive("/abo-matrix")
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-amber-500 hover:bg-sidebar-accent hover:text-amber-400"
            )}
          >
            <Diamond className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Abo-Matrix</span>}
          </NavLink>
        )}

        {/* Admin Link - only visible for admins */}
        {isAdmin && (
          <NavLink
            to="/admin/mission-control"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
              isActive("/admin/mission-control")
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-amber-500 hover:bg-sidebar-accent hover:text-amber-400"
            )}
          >
            <Shield className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Mission Control</span>}
          </NavLink>
        )}
        
        {bottomItems.map((item) => {
          const isLocked = item.module !== null && !hasModuleAccess(item.module);
          
          // Coming Soon items - disabled with badge
          if (item.comingSoon) {
            return (
              <div
                key={item.title}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
                  "text-sidebar-foreground/40 cursor-not-allowed"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0 opacity-50", collapsed && "mx-auto")} />
                {!collapsed && (
                  <>
                    <span className="font-medium text-[15px] opacity-50">{item.title}</span>
                    <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      Coming Soon
                    </span>
                  </>
                )}
              </div>
            );
          }
          
          if (isLocked) {
            return (
              <button
                key={item.title}
                onClick={() => item.module && handleLockedClick(item.module)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
                  "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 cursor-not-allowed"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0 opacity-50", collapsed && "mx-auto")} />
                {!collapsed && (
                  <>
                    <span className="font-medium text-[15px] opacity-50">{item.title}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </>
                )}
              </button>
            );
          }
          return <NavItem key={item.title} item={item} showBadge={false} />;
        })}
        
        {/* Support Button */}
        <NavLink
          to="/support"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
            isActive("/support")
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <LifeBuoy className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="font-medium text-[15px]">Hilfe & Support</span>}
        </NavLink>

        <PWAInstallButton collapsed={collapsed} />
        
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
            "text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="font-medium text-[15px]">Abmelden</span>}
        </button>

        <Separator className="my-2 bg-sidebar-border" />

        {/* Legal Links */}
        {!collapsed ? (
          <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-1 text-xs text-sidebar-foreground/50">
            <a 
              href="https://hufmanager.de/impressum" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Impressum
            </a>
            <span>•</span>
            <a 
              href="https://hufmanager.de/datenschutz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Datenschutz
            </a>
            <span>•</span>
            <a 
              href="https://hufmanager.de/agb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              AGB
            </a>
          </div>
        ) : (
          <a
            href="https://hufmanager.de/impressum"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center px-3 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              "text-sidebar-foreground/50 hover:text-primary"
            )}
            title="Rechtliches"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
      </div>
    </aside>
  );
}
