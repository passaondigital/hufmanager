import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { Home, Calendar, Plus, User, MessageSquare, BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const providerNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Calendar, label: "Kalender", path: "/kalender" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Zap, label: "AutoFlow", path: "/autoflow" },
];

const clientNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/client-home" },
  { icon: Calendar, label: "Buchen", path: "/client-booking" },
  { icon: MessageSquare, label: "Chat", path: "/client-chat" },
  { icon: User, label: "Profil", path: "/client-profile" },
];

const quickActions = [
  { label: "Neuer Termin", path: "/kalender", icon: Calendar },
  { label: "Neuer Kunde", path: "/aufnahme", icon: User },
  { label: "Neues Pferd", path: "/aufnahme", icon: Home },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { role } = useAuth();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Determine which nav items to show based on role
  const navItems = role === "client" ? clientNavItems : providerNavItems;
  
  // Check if current route is active
  const isActive = (path: string) => {
    if (path === "/" || path === "/client-home") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ 
          paddingBottom: "env(safe-area-inset-bottom, 0px)" 
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive(item.path) 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1 transition-transform",
                isActive(item.path) && "scale-110"
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          
          {/* Center Plus Button - Only for providers */}
          {role !== "client" && (
            <button
              onClick={() => setShowQuickActions(true)}
              className="flex items-center justify-center -mt-5 z-10"
            >
              <div className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
                <Plus className="h-7 w-7 text-primary-foreground" />
              </div>
            </button>
          )}
          
          {navItems.slice(2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive(item.path) 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1 transition-transform",
                isActive(item.path) && "scale-110"
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Actions Sheet */}
      <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-center">Schnell-Aktionen</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pb-4">
            {quickActions.map((action) => (
              <NavLink
                key={action.label}
                to={action.path}
                onClick={() => setShowQuickActions(false)}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <action.icon className="h-6 w-6 text-primary mb-2" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </NavLink>
            ))}
          </div>
          <Button 
            variant="ghost" 
            className="w-full h-12"
            onClick={() => setShowQuickActions(false)}
          >
            Abbrechen
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
