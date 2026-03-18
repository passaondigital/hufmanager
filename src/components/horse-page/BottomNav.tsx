import { Home, Footprints, CalendarDays, ClipboardList, User, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLogout } from "@/hooks/useLogout";
import { toast } from "sonner";
import { useState } from "react";

const NAV_ITEMS: { label: string; icon: typeof Home; path: string; match?: string }[] = [
  { label: "Home", icon: Home, path: "/client-home" },
  { label: "Pferde", icon: Footprints, path: "/client-horses", match: "/client-horse" },
  { label: "Termine", icon: CalendarDays, path: "/client-booking" },
  { label: "Aufträge", icon: ClipboardList, path: "/client-orders" },
  { label: "Profil", icon: User, path: "/client-profile" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Erfolgreich abgemeldet");
  };

  return (
    <>
      {/* Logout confirmation overlay */}
      {showLogout && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowLogout(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-2xl p-5 pb-8 space-y-3"
            style={{ background: "var(--hp-bg2)", borderTop: "1px solid var(--hp-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-[15px] font-medium" style={{ color: "var(--hp-text)" }}>
              Möchtest du dich abmelden?
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2"
              style={{ background: "rgba(232,86,74,0.15)", color: "#e8564a" }}
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
            <button
              onClick={() => setShowLogout(false)}
              className="w-full py-3 rounded-lg text-[14px] font-medium"
              style={{ background: "var(--hp-bg3)", color: "var(--hp-text2)" }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

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

          const handleClick = () => {
            if (item.path === "/client-profile") {
              // Long press could show logout, but for now navigate
              navigate(item.path);
            } else {
              navigate(item.path);
            }
          };

          return (
            <button
              key={item.label}
              onClick={handleClick}
              onContextMenu={(e) => {
                if (item.path === "/client-profile") {
                  e.preventDefault();
                  setShowLogout(true);
                }
              }}
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
    </>
  );
}
