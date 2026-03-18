import { Home, Footprints, CalendarDays, ClipboardList, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/client-home" },
  { label: "Pferde", icon: Footprints, path: "/client-home", match: "/client-horse" },
  { label: "Termine", icon: CalendarDays, path: "/kalender" },
  { label: "Aufträge", icon: ClipboardList, path: "/auftraege" },
  { label: "Profil", icon: User, path: "/profil" },
] as const;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "var(--hp-bg)",
        borderTop: "0.5px solid var(--hp-border)",
        padding: "6px 0 env(safe-area-inset-bottom, 20px)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          (item.match && location.pathname.startsWith(item.match));
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-0.5 min-w-[56px]"
          >
            <Icon
              className="h-5 w-5"
              style={{ color: isActive ? "var(--hp-amber)" : "var(--hp-text3)" }}
            />
            <span
              className="text-[10px]"
              style={{ color: isActive ? "var(--hp-amber)" : "var(--hp-text3)" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
