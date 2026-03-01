import { useNavigate, useLocation } from "react-router-dom";
import { Home, Footprints, Calendar, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/client-home", label: "Home", icon: Home },
  { path: "/client-home", hash: "#pferde", label: "Pferde", icon: Footprints },
  { path: "/client-booking", label: "Buchen", icon: Calendar },
  { path: "/client-chat", label: "Chat", icon: MessageSquare },
  { path: "/client-profile", label: "Profil", icon: User },
];

export function ClientBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.hash) return false; // "Pferde" is a scroll target, never "active" per se
    return location.pathname === tab.path;
  };

  const handleClick = (tab: typeof tabs[0]) => {
    if (tab.hash) {
      if (location.pathname === "/client-home") {
        document.getElementById("pferde-section")?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/client-home");
        setTimeout(() => {
          document.getElementById("pferde-section")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-[72px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.label}
              onClick={() => handleClick(tab)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-7 w-7" strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn("text-xs", active && "font-semibold")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
