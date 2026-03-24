import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Link2, Users, Coins, Globe, Newspaper,
  Palette, Trophy, User, LogOut, Menu, X, ChevronRight
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/botschafter/dashboard", icon: LayoutDashboard, label: "Dashboard", emoji: "📊" },
  { path: "/botschafter/links", icon: Link2, label: "Meine Links", emoji: "🔗" },
  { path: "/botschafter/conversions", icon: Users, label: "Partner/innen", emoji: "👥" },
  { path: "/botschafter/umsaetze", icon: Coins, label: "Umsätze", emoji: "💰" },
  { path: "/botschafter/sponsoring", icon: Globe, label: "Sponsoring", emoji: "🌐" },
  { path: "/botschafter/insights", icon: Newspaper, label: "Insights", emoji: "📰" },
  { path: "/botschafter/werbemittel", icon: Palette, label: "Werbemittel", emoji: "🎨" },
  { path: "/botschafter/rangliste", icon: Trophy, label: "Rangliste", emoji: "🏆" },
  { path: "/botschafter/profil", icon: User, label: "Profil", emoji: "👤" },
];

const MOBILE_TABS = [
  { path: "/botschafter/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/botschafter/links", icon: Link2, label: "Links" },
  { path: "/botschafter/conversions", icon: Users, label: "Partner" },
  { path: "/botschafter/umsaetze", icon: Coins, label: "Umsätze" },
  { path: "/botschafter/profil", icon: User, label: "Mehr" },
];

export function BotschafterLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { /* proceed */ }
    queryClient.clear();
    sessionStorage.removeItem("botschafter_login_source");
    navigate("/botschafter/login", { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0700", color: "#fafaf9" }}>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 border-b h-14 flex items-center px-4 md:px-6" style={{ backgroundColor: "#111108", borderColor: "#2a2a1f" }}>
        <button className="md:hidden mr-3" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">🤝 HufManager</span>
          <Badge className="text-[10px] font-bold px-1.5 py-0" style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
            Botschafter
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs hidden md:block" style={{ color: "#9ca3af" }}>{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs" style={{ color: "#9ca3af" }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className={cn(
          "fixed md:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-56 border-r flex flex-col transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )} style={{ backgroundColor: "#111108", borderColor: "#2a2a1f" }}>
          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "text-[#F5970A]"
                    : "text-[#9ca3af] hover:text-white hover:bg-white/5"
                )}
                style={isActive(item.path) ? { backgroundColor: "rgba(245,151,10,0.1)" } : undefined}
              >
                <span className="text-base">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t p-2 space-y-0.5" style={{ borderColor: "#2a2a1f" }}>
            <Link
              to="/botschafter/hufmanager"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="text-base">🐴</span>
              <span>HufManager</span>
              <ChevronRight className="w-3 h-3 ml-auto" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#9ca3af] hover:text-red-400 hover:bg-white/5 transition-colors w-full"
            >
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t flex" style={{ backgroundColor: "#111108", borderColor: "#2a2a1f" }}>
        {MOBILE_TABS.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive(tab.path) ? "text-[#F5970A]" : "text-[#6b7280]"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
