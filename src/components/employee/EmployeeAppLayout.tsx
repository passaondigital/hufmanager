import { useState, useEffect } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import {
  Home,
  Route,
  Camera,
  Notebook,
  User,
  Menu,
  Sun,
  Moon,
  LogOut,
  Clock,
  ClipboardList,
  MessageSquare,
  Package,
  CalendarOff,
  FileText,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";

const getBottomNavItems = (permissions: Record<string, boolean>) => {
  const items = [
    { icon: Home, label: "Home", path: "/employee" },
  ];
  if (permissions.can_use_tour_manager || permissions.can_use_maps) {
    items.push({ icon: Route, label: "Tour", path: "/employee/tour" });
  }
  items.push(
    { icon: Camera, label: "HufCam", path: "/employee/hufcam" },
    { icon: Notebook, label: "Notizbuch", path: "/employee/notizbuch" },
    { icon: User, label: "Profil", path: "/employee/profil" },
  );
  return items;
};

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

const getSidebarItems = (permissions: Record<string, boolean>): SidebarItem[] => {
  const items: SidebarItem[] = [
    { icon: Home, label: "Dashboard", path: "/employee" },
  ];
  if (permissions.can_use_tour_manager || permissions.can_use_maps) {
    items.push({ icon: Route, label: "Meine Tour", path: "/employee/tour" });
  }
  items.push(
    { icon: Clock, label: "Zeiterfassung", path: "/employee/timer" },
    { icon: Camera, label: "HufCam Pro", path: "/employee/hufcam" },
    { icon: ClipboardList, label: "Hufanalyse", path: "/employee/analyse" },
    { icon: MessageSquare, label: "Chat", path: "/employee/chat" },
    { icon: Package, label: "Material", path: "/employee/material" },
    { icon: CalendarOff, label: "Abwesenheiten", path: "/employee/abwesenheiten" },
    { icon: FileText, label: "Vertrag", path: "/employee/vertrag" },
    { icon: ShoppingBag, label: "Leistungskatalog", path: "/employee/angebot" },
    { icon: Notebook, label: "Mein Notizbuch", path: "/employee/notizbuch" },
    { icon: User, label: "Profil", path: "/employee/profil" },
  );
  return items;
};

export function EmployeeAppLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile, isLoading } = useEmployeeProfile();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/employee") return location.pathname === "/employee";
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const customPerms = profile?.custom_permissions || {};
  const bottomNavItems = getBottomNavItems(customPerms as Record<string, boolean>);
  const sidebarItems = getSidebarItems(customPerms as Record<string, boolean>);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Kein Mitarbeiterprofil</h2>
          <p className="text-muted-foreground">Dein Konto ist nicht als Mitarbeiter registriert.</p>
          <Button variant="outline" onClick={() => signOut()}>Abmelden</Button>
        </div>
      </div>
    );
  }

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
          <span className="font-semibold text-sm">MitarbeiterApp</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                <Badge variant="secondary" className="text-xs">
                  {profile.role === "team_lead" ? "Teamleiter" : profile.role === "employee" ? "Mitarbeiter" : "Assistent"}
                </Badge>
              </div>
            </div>
          </div>
          <nav className="p-2 space-y-1">
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
                {item.badge && <Badge variant="secondary" className="text-xs">{item.badge}</Badge>}
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
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">MitarbeiterApp</p>
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
