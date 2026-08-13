import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Map, Menu, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, Sparkles, Users } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Heute", path: "/home", icon: CalendarDays },
  { label: "Tour", path: "/home/tour", icon: Map },
  { label: "Kunden & Pferde", path: "/home/kunden", icon: Users },
  { label: "Hufi Hufanalyse", path: "/home/hufi-hufanalyse", icon: Sparkles },
  { label: "Finanzen", path: "/home/finanzen", icon: ReceiptText },
  { label: "Mehr", path: "/home/mehr", icon: Settings },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/home": "Heute",
  "/home/tour": "Tour",
  "/home/kunden": "Kunden & Pferde",
  "/home/hufi-hufanalyse": "Hufi Hufanalyse",
  "/home/finanzen": "Finanzen",
  "/home/mehr": "Mehr / Einstellungen",
};

export function HufManagerSlimShell() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("hm-sidebar-collapsed") === "true");
  const currentTitle = PAGE_TITLES[location.pathname] ?? "HufManager";

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem("hm-sidebar-collapsed", String(!collapsed));
      return !collapsed;
    });
  };

  return (
    <div className="hm-slim min-h-screen bg-hm-canvas text-hm-text">
      <aside className={`fixed inset-y-0 left-0 z-bar hidden border-r border-hm-border bg-hm-surface transition-[width] duration-200 lg:flex lg:flex-col ${sidebarCollapsed ? "w-20" : "w-[var(--hm-sidebar-w)]"}`}>
        <div className={`flex h-[var(--hm-header-h)] items-center border-b border-hm-border ${sidebarCollapsed ? "justify-center px-2" : "px-6"}`}>
          <Brand compact={sidebarCollapsed} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SlimNavItem key={item.path} item={item} onNavigate={() => undefined} />
          ))}
        </nav>
        <div className={`border-t border-hm-border p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <button type="button" onClick={toggleSidebar} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-hm-muted transition hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5" aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5" /><span>Sidebar einklappen</span></>}
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-[var(--hm-sidebar-w)]"}`}>
        <header className="sticky top-0 z-bar border-b border-hm-border bg-hm-surface">
          <div className="flex h-[var(--hm-header-h)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-hm-border bg-hm-surface text-hm-text shadow-sm lg:hidden"
                aria-label="Navigation öffnen"
                aria-expanded={mobileNavOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block lg:hidden">
                <Brand />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-hm-muted">HufManager</p>
                <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-hm-text">{currentTitle}</h1>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex" aria-hidden="true" />
          </div>

          {mobileNavOpen && (
            <nav className="border-t border-hm-border bg-hm-surface px-3 py-3 lg:hidden">
              <div className="grid gap-2 sm:grid-cols-3">
                {NAV_ITEMS.map((item) => (
                  <SlimNavItem key={item.path} item={item} onNavigate={() => setMobileNavOpen(false)} />
                ))}
              </div>
            </nav>
          )}
        </header>

        <main className="w-full px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-bar border-t border-hm-border bg-hm-surface md:hidden">
        <div className="grid grid-cols-6 gap-1 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/home"}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold leading-none transition ${
                  active ? "bg-[var(--hm-orange)] text-white" : "text-hm-muted hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="line-clamp-2 text-center">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none">
      {compact ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hm-orange)] text-base font-bold text-white">HM</div>
      ) : (
        <div className="text-[1.35rem] font-bold tracking-[-0.04em] text-hm-text">Huf<span className="text-[var(--hm-orange)]">Manager</span></div>
      )}
    </div>
  );
}

function SlimNavItem({
  item,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === "/home"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive
            ? "bg-[var(--hm-orange)] text-white shadow-[0_8px_18px_rgba(255,106,0,0.22)]"
            : "text-hm-text hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="overflow-hidden whitespace-nowrap">{item.label}</span>
    </NavLink>
  );
}
