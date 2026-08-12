import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Map, Users, Sparkles, ReceiptText, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Heute", path: "/home", icon: CalendarDays },
  { label: "Tour", path: "/home/tour", icon: Map },
  { label: "Kunden & Pferde", path: "/home/kunden", icon: Users },
  { label: "Hufi Hufanalyse", path: "/home/hufi-hufanalyse", icon: Sparkles },
  { label: "Finanzen", path: "/home/finanzen", icon: ReceiptText },
  { label: "Mehr", path: "/home/mehr", icon: Settings },
] as const;

export function HufManagerSlimShell() {
  const location = useLocation();
  const isToday = location.pathname === "/home";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">HUFMANAGER SLIM</p>
            <h1 className="text-lg font-semibold text-slate-950">{isToday ? "Heute" : "HUFMANAGER SLIM"}</h1>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/home"}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-6 gap-1 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/home"}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium leading-none transition ${
                  active ? "bg-orange-50 text-orange-700" : "text-slate-500"
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

