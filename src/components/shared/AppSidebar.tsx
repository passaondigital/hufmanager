import { useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/hooks/useLogout";
import { ChevronRight, ChevronDown, LogOut, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

export function AppSidebar({ appName, userDisplayName, userAvatar, navigationConfig, mobile }: AppSidebarProps) {
  const location = useLocation();
  const logout = useLogout();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [managementOpen, setManagementOpen] = useState(false);

  const isActive = useCallback((path: string) => {
    // Strip query params for pathname comparison
    const basePath = path.split("?")[0];
    if (basePath === "/partner-home" || basePath === "/employee") return location.pathname === basePath;
    // For paths with query params, check both pathname and search
    if (path.includes("?")) {
      const searchPart = path.split("?")[1];
      return location.pathname.startsWith(basePath) && location.search.includes(searchPart);
    }
    return location.pathname.startsWith(basePath);
  }, [location.pathname, location.search]);

  // Auto-open the category that contains the active path
  const findActiveCategory = useCallback(() => {
    for (const group of navigationConfig.groups) {
      for (const cat of group.items) {
        if (cat.children?.some(c => isActive(c.path))) return cat.id;
      }
    }
    return null;
  }, [navigationConfig, isActive]);

  const effectiveOpen = openCategory ?? findActiveCategory();

  const toggleCategory = (id: string) => {
    setOpenCategory(prev => prev === id ? null : id);
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Separate Management group from main groups
  const managementGroup = navigationConfig.groups.find(g => g.label === "Management");
  const mainGroups = navigationConfig.groups.filter(g => g.label !== "Management");
  const managementItem = managementGroup?.items.find(i => i.id === "management");
  const supportItem = managementGroup?.items.find(i => i.id === "support");
  const isManagementActive = managementItem?.children?.some(c => isActive(c.path)) || false;

  // Auto-open management if active
  const effectiveManagementOpen = managementOpen || isManagementActive;

  const renderCategory = (cat: NavCategory) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isOpen = effectiveOpen === cat.id;
    const catActive = cat.path ? isActive(cat.path) : cat.children?.some(c => isActive(c.path));

    if (!hasChildren && cat.path) {
      return (
        <div key={cat.id}>
          <NavLink
            to={cat.path}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 w-full rounded-none",
              catActive
                ? "bg-orange-500 text-white font-semibold [&_svg]:text-white"
                : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-500"
            )}
          >
            {cat.number && <span className={cn("text-[11px] font-bold min-w-[16px]", catActive ? "text-white" : "text-muted-foreground/40")}>{cat.number}</span>}
            <LucideIcon name={cat.iconName} className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{cat.label}</span>
            {cat.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cat.badge}</Badge>}
          </NavLink>
        </div>
      );
    }

    return (
      <div key={cat.id}>
        <button
          onClick={() => toggleCategory(cat.id)}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 w-full text-[13px] font-medium transition-colors duration-150 rounded-none",
            catActive
              ? "bg-orange-500 text-white font-semibold [&_svg]:text-white"
              : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-500"
          )}
        >
          {cat.number && <span className={cn("text-[11px] font-bold min-w-[16px]", catActive ? "text-white" : "text-muted-foreground/40")}>{cat.number}</span>}
          <LucideIcon name={cat.iconName} className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">{cat.label}</span>
          {cat.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">{cat.badge}</Badge>}
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", catActive ? "text-white opacity-80" : "opacity-40", isOpen && "rotate-90")} />
        </button>
        {isOpen && cat.children && (
          <div className="py-0.5">
            {cat.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                className={cn(
                  "block py-1.5 pr-4 text-[12.5px] transition-colors duration-150",
                  isActive(child.path)
                    ? "text-orange-500 border-l-[3px] border-orange-500 bg-orange-500/[0.08] pl-[41px]"
                    : "text-muted-foreground/55 hover:text-foreground/90 hover:bg-muted/30 pl-11"
                )}
              >
                {child.label}
                {child.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-2">{child.badge}</Badge>}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={cn("w-60 h-screen flex flex-col border-r border-border bg-card", !mobile && "fixed left-0 top-0 z-40")}>
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center gap-3 border-b border-border shrink-0">
        <Avatar className="h-9 w-9">
          {userAvatar && <AvatarImage src={userAvatar} />}
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(userDisplayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{userDisplayName}</p>
          <p className="text-xs text-muted-foreground">{appName}</p>
        </div>
      </div>

      {/* Scrollable Nav (main groups only) */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">
        {/* Direct items (e.g. Dashboard) */}
        {navigationConfig.directItems?.map(item => renderCategory(item))}

        {/* Main Groups (excluding Management) */}
        {mainGroups.map(group => (
          <div key={group.label}>
            <div className="px-4 pt-4 pb-1">
              <span className="text-[10px] font-bold tracking-[1.2px] text-muted-foreground/40 uppercase">
                {group.label}
              </span>
            </div>
            {group.items.map(cat => renderCategory(cat))}
          </div>
        ))}
      </nav>

      {/* Bottom-Pinned Management Section */}
      {managementGroup && (
        <div className="shrink-0 border-t border-border px-2 py-2 space-y-0.5">
          {/* Management Collapsible */}
          {managementItem && (
            <Collapsible
              open={effectiveManagementOpen}
              onOpenChange={() => setManagementOpen(prev => !prev)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
                    isManagementActive
                      ? "bg-orange-500/10 text-orange-500"
                      : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <LucideIcon name={managementItem.iconName} className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{managementItem.label}</span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
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
                        ? "bg-orange-500/10 text-orange-500"
                        : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="text-xs">{child.label}</span>
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Hilfe & Support - outside Management */}
          {supportItem && (
            <NavLink
              to={supportItem.path!}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                isActive(supportItem.path!)
                  ? "bg-orange-500/10 text-orange-500"
                  : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              )}
            >
              <LifeBuoy className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{supportItem.label}</span>
            </NavLink>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">Abmelden</span>
          </button>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-muted-foreground/40">
            <a href="https://hufmanager.de/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
              Impressum
            </a>
            <span>·</span>
            <a href="https://hufmanager.de/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
              Datenschutz
            </a>
          </div>
        </div>
      )}

      {/* Fallback Logout if no Management group */}
      {!managementGroup && (
        <div className="shrink-0 border-t border-border">
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
