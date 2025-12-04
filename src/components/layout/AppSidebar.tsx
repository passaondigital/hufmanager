import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  Scissors,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
];

const bottomItems = [
  { title: "Academy", url: "/academy", icon: GraduationCap },
  { title: "Management", url: "/management", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ item, showBadge = true }: { item: typeof funnelItems[0]; showBadge?: boolean }) => (
    <NavLink
      to={item.url}
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
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">HM</span>
            </div>
            <span className="text-sidebar-foreground font-semibold text-lg">HufManager</span>
          </div>
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
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="font-medium">Abmelden</span>}
        </button>
      </div>
    </aside>
  );
}
