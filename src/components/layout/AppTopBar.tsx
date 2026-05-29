import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useLogout } from "@/hooks/useLogout";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AppTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);

  const isHome = location.pathname === "/home" ||
    location.pathname === "/client-home" ||
    location.pathname === "/employee" ||
    location.pathname === "/partner-home";

  const label = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    const last = parts[parts.length - 1];
    const labels: Record<string, string> = {
      kalender: "Kalender", kunden: "Kunden", pferde: "Pferde",
      rechnungen: "Rechnungen", anfragen: "Anfragen", angebote: "Angebote",
      einstellungen: "Einstellungen", archiv: "Archiv", home: "",
      "client-home": "", employee: "", "partner-home": "",
    };
    return labels[last] ?? "";
  })();

  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: back or logo */}
        <div className="flex items-center gap-2 min-w-0">
          {!isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-primary transition-opacity active:opacity-60"
              style={{ minWidth: 44, minHeight: 44, marginLeft: -8 }}
              aria-label="Zurück"
            >
              <ArrowLeft className="h-5 w-5 flex-shrink-0" />
              {label && (
                <span className="text-sm font-medium truncate max-w-[140px]">{label}</span>
              )}
            </button>
          ) : (
            <span style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#1A1A1A" }}>
              Huf<span style={{ color: "#F97316" }}>Manager</span>
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <NotificationBell className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl active:scale-90 transition-all" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center h-9 w-9 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-90 transition-all"
                aria-label="Menü"
              >
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate("/management")}>
                <Settings className="h-4 w-4 mr-2" />
                Einstellungen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  await logout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {loggingOut ? "Abmelden…" : "Abmelden"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
