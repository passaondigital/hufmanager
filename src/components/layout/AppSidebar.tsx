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
  Wallet,
  FlaskConical,
  Package,
  UsersRound,
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
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { FeatureKey } from "@/types/featureFlags";

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

interface MainNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey: FeatureKey | null;
}

// Die 5 A's - Core Navigation für Profis (#pid)
interface FiveAsItem {
  number: number;
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description: string;
}

// Erweiterungen - Locked Add-ons
interface AddonItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
}

const addonItems: AddonItem[] = [
  { title: "Lager", icon: Warehouse, locked: true },
  { title: "Mitarbeiter", icon: UsersRound, locked: true },
];

interface BottomNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey: FeatureKey | null;
  comingSoon?: boolean;
}

const bottomItems: BottomNavItem[] = [
  { title: "Academy", url: "/academy", icon: GraduationCap, featureKey: "module_academy", comingSoon: true },
  { title: "Geld verdienen", url: "/partner", icon: Gift, featureKey: null },
  { title: "Management", url: "/management", icon: Settings, featureKey: null },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

interface NavItemType {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  showBetaBadge?: boolean;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: newLeadsCount = 0 } = useNewLeadsCount();
  const { isFeatureVisible, showBetaBadge: checkBetaBadge, getFeatureStatus } = useSubscription();
  const { role, user } = useAuth();
  
  const isAdmin = role === "admin";
  const canSeeAboMatrix = user?.email && STEALTH_EMAILS.includes(user.email);

  // Die 5 A's - Der Profi-Workflow (mit Nummern für visuelle Führung)
  const fiveAsItems: (FiveAsItem & { badge?: number; number: number })[] = [
    { 
      number: 1,
      title: "Anfragen", 
      url: "/anfragen", 
      icon: MessageSquare, 
      badge: newLeadsCount > 0 ? newLeadsCount : undefined,
      description: "Inbox für neue Leads"
    },
    { number: 2, title: "Angebote", url: "/angebote", icon: FileText, description: "Kostenvoranschläge" },
    { number: 3, title: "Aufnahme", url: "/aufnahme", icon: UserPlus, description: "Kunden & Pferde verwalten" },
    { number: 4, title: "Auffassen", url: "/kalender", icon: Calendar, description: "Termine & Tour-Planung" },
    { number: 5, title: "Analyse", url: "/analyse", icon: BarChart3, description: "Finanzen & Dokumentation" },
  ];

  // Quick Access Items
  const quickAccessItems: NavItemType[] = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Kunden", url: "/kunden", icon: Users },
    { title: "Services", url: "/services", icon: Scissors },
  ];

  const handleDisabledClick = (featureName: string) => {
    toast({
      title: "Modul nicht verfügbar",
      description: `${featureName} ist für deinen Account nicht aktiviert. Kontaktiere den Support.`,
      variant: "destructive",
    });
  };

  const handleLockedClick = (featureName: string) => {
    toast({
      title: "Erweiterung gesperrt",
      description: `${featureName} ist ein kostenpflichtiges Add-on. Upgrade auf Pro für alle Features.`,
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

  const NavItem = ({ item, showBadgeCount = true }: { item: NavItemType; showBadgeCount?: boolean }) => (
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
          {item.showBetaBadge && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
              BETA
            </Badge>
          )}
          {showBadgeCount && item.badge !== undefined && Number(item.badge) > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const FiveAsNavItem = ({ item, index }: { item: FiveAsItem & { badge?: number }; index: number }) => (
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
      {/* Nummer-Badge für visuelle Führung */}
      <div className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0",
        isActive(item.url)
          ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
          : "bg-primary/10 text-primary"
      )}>
        {item.number}
      </div>
      <item.icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors", 
        collapsed && "mx-auto",
        isActive(item.url) && "text-sidebar-primary-foreground"
      )} />
      {!collapsed && (
        <>
          <span className="font-medium text-[15px]">{item.title}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const LockedAddonItem = ({ item }: { item: AddonItem }) => (
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
        {/* Quick Access */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
              Schnellzugriff
            </p>
          )}
          {quickAccessItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
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
          {fiveAsItems.map((item, index) => (
            <FiveAsNavItem key={item.title} item={item} index={index} />
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
                : "text-sidebar-accent-foreground hover:bg-sidebar-accent"
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
                : "text-sidebar-accent-foreground hover:bg-sidebar-accent"
            )}
          >
            <Shield className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-[15px]">Mission Control</span>}
          </NavLink>
        )}
        
        {bottomItems.map((item) => {
          const featureKey = item.featureKey;
          const isHidden = featureKey !== null && !isFeatureVisible(featureKey);
          const hasBetaBadge = featureKey !== null && checkBetaBadge(featureKey);
          
          // Hidden items - don't render
          if (isHidden) return null;
          
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
          
          return (
            <NavLink
              key={item.title}
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
                  {hasBetaBadge && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
                      BETA
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );
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
