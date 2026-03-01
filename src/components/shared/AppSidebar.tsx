import { useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLogout } from "@/hooks/useLogout";
import { ChevronDown, LogOut, LifeBuoy, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──────────────────────────────────────────────

export interface NavItem {
  label: string;
  path: string;
  iconName?: string;
  badge?: string;
}

export interface NavCategory {
  id: string;
  number?: string;
  label: string;
  iconName: string;
  path?: string;
  children?: NavItem[];
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavCategory[];
}

export interface NavigationConfig {
  directItems?: NavCategory[];
  groups: NavGroup[];
}

export interface AppSidebarProps {
  appName: string;
  userDisplayName: string;
  userAvatar?: string;
  navigationConfig: NavigationConfig;
  mobile?: boolean;
}

// ── Icon Helper ────────────────────────────────────────

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (icons as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

// ── Component ──────────────────────────────────────────

export function AppSidebar({ appName, userDisplayName, navigationConfig, mobile }: AppSidebarProps) {
  const location = useLocation();
  const logout = useLogout();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [managementOpen, setManagementOpen] = useState(false);

  const isActive = useCallback((path: string) => {
    const basePath = path.split("?")[0];
    if (basePath === "/partner-home" || basePath === "/employee") return location.pathname === basePath;
    if (path.includes("?")) {
      const searchPart = path.split("?")[1];
      return location.pathname.startsWith(basePath) && location.search.includes(searchPart);
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  }, [location.pathname, location.search]);

  const isMenuActive = useCallback((cat: NavCategory) => {
    if (cat.path) return isActive(cat.path);
    return cat.children?.some(c => isActive(c.path)) || false;
  }, [isActive]);

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Separate Management group from main groups
  const managementGroup = navigationConfig.groups.find(g => g.label === "Management");
  const mainGroups = navigationConfig.groups.filter(g => g.label !== "Management");
  const managementItem = managementGroup?.items.find(i => i.id === "management");
  const supportItem = managementGroup?.items.find(i => i.id === "support");
  const isManagementActiveFlag = managementItem?.children?.some(c => isActive(c.path)) || false;
  const effectiveManagementOpen = managementOpen || isManagementActiveFlag;

  // ── Sub-item renderer (inside collapsible) ──────────
  const SubNavItem = ({ child }: { child: NavItem }) => (
    <NavLink
      to={child.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-8 min-h-[40px]",
        isActive(child.path)
          ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      {child.iconName && <LucideIcon name={child.iconName} className="h-4 w-4 shrink-0" />}
      <span className="text-sm">{child.label}</span>
      {child.badge && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{child.badge}</Badge>
      )}
    </NavLink>
  );

  // ── Main nav item with collapsible ──────────────────
  const MainNavItem = ({ cat }: { cat: NavCategory }) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const menuActive = isMenuActive(cat);
    const isOpen = openMenus[cat.id] ?? menuActive;

    // Direct link (no children)
    if (!hasChildren && cat.path) {
      return (
        <NavLink
          to={cat.path}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
            menuActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          {cat.number && (
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
              menuActive
                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {cat.number}
            </div>
          )}
          <LucideIcon name={cat.iconName} className="h-5 w-5 shrink-0" />
          <span className="font-medium text-[15px] flex-1 text-left">{cat.label}</span>
          {cat.badge && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {cat.badge}
            </span>
          )}
        </NavLink>
      );
    }

    // Collapsible with children
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleMenu(cat.id)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]",
              menuActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            {cat.number && (
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
                menuActive
                  ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}>
                {cat.number}
              </div>
            )}
            <LucideIcon name={cat.iconName} className={cn("h-5 w-5 shrink-0")} />
            <span className="font-medium text-[15px] flex-1 text-left">{cat.label}</span>
            {cat.badge && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center mr-2">
                {cat.badge}
              </span>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-1">
          {cat.children?.map((child) => (
            <SubNavItem key={child.path} child={child} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      "w-64 h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border",
      !mobile && "fixed left-0 top-0 z-40"
    )}>
      {/* Logo Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <img
          src="/hufmanager-logo.png"
          alt="HufManager"
          className="h-10 w-auto"
        />
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Direct items (e.g. Dashboard) */}
        {navigationConfig.directItems && (
          <div className="px-3 mb-2">
            {navigationConfig.directItems.map(item => (
              <MainNavItem key={item.id} cat={item} />
            ))}
          </div>
        )}

        <Separator className="my-4 bg-sidebar-border" />

        {/* Main Groups */}
        {mainGroups.map((group, idx) => (
          <div key={group.label}>
            {idx > 0 && <Separator className="my-4 bg-sidebar-border" />}
            <div className="px-3 space-y-1">
              <p className="text-xs font-medium text-sidebar-primary uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                {group.label === "Die 5 A's" && (
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
                {group.label === "Erweiterungen" && (
                  <Package className="h-3 w-3" />
                )}
                {group.label}
              </p>
              {group.items.map(cat => (
                <MainNavItem key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Bottom-Pinned Management Section */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-2 space-y-0.5">
        {managementItem && (
          <Collapsible
            open={effectiveManagementOpen}
            onOpenChange={() => setManagementOpen(prev => !prev)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
                  isManagementActiveFlag
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <LucideIcon name={managementItem.iconName} className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium flex-1 text-left">{managementItem.label}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  effectiveManagementOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pt-1">
              {managementItem.children?.map(child => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 ml-4",
                    isActive(child.path)
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <span className="text-xs">{child.label}</span>
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Hilfe & Support */}
        {supportItem && (
          <NavLink
            to={supportItem.path!}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
              isActive(supportItem.path!)
                ? "bg-sidebar-primary/10 text-sidebar-primary"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LifeBuoy className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{supportItem.label}</span>
          </NavLink>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">Abmelden</span>
        </button>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-sidebar-foreground/40">
          <a href="https://hufmanager.de/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-sidebar-foreground hover:underline">
            Impressum
          </a>
          <span>·</span>
          <a href="https://hufmanager.de/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-sidebar-foreground hover:underline">
            Datenschutz
          </a>
        </div>
      </div>

      {/* Fallback Logout if no Management group */}
      {!managementGroup && (
        <div className="shrink-0 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-4 py-4 w-full text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Abmelden</span>
          </button>
        </div>
      )}
    </aside>
  );
}

// ── Mobile Sidebar (Sheet wrapper) ─────────────────────

interface MobileSidebarProps extends AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileAppSidebar({ open, onOpenChange, ...props }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-72">
        <div className="h-full" onClick={() => onOpenChange(false)}>
          <AppSidebar {...props} mobile />
        </div>
      </SheetContent>
    </Sheet>
  );
}
