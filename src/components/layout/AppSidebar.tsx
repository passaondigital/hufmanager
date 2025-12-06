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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const funnelItems = [
  { title: "Anfragen", url: "/anfragen", icon: MessageSquare, badge: "3" },
  { title: "Angebote", url: "/angebote", icon: FileText },
  { title: "Aufnahme", url: "/aufnahme", icon: UserPlus },
  { title: "Auffassen", url: "/auffassen", icon: Star },
  { title: "Analyse", url: "/analyse", icon: BarChart3 },
];

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Kalender", url: "/kalender", icon: Calendar },
  { title: "Kunden", url: "/kunden", icon: Users },
  { title: "Services", url: "/services", icon: Scissors },
  { title: "Hufanalyse", url: "/hufanalyse", icon: ClipboardList },
  { title: "Chat", url: "/chat", icon: MessagesSquare },
];

const bottomItems = [
  { title: "Academy", url: "/academy", icon: GraduationCap },
  { title: "Geld verdienen", url: "/partner", icon: Gift },
  { title: "Management", url: "/management", icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const NavItem = ({ item, showBadge = true }: { item: typeof funnelItems[0]; showBadge?: boolean }) => (
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
          {showBadge && 'badge' in item && item.badge && (
            <span className="ml-auto bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Main Navigation */}
        <div className="px-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
              Übersicht
            </p>
          )}
          {mainItems.map((item) => (
            <NavItem key={item.title} item={item} showBadge={false} />
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
        {bottomItems.map((item) => (
          <NavItem key={item.title} item={item} showBadge={false} />
        ))}
        
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
