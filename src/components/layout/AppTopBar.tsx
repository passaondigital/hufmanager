import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HufiMenu } from "./HufiMenu";

export const AppTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      className="fixed left-0 top-0 z-bar flex w-full flex-col border-b border-hm-border bg-hm-surface lg:left-[var(--hm-sidebar-w)] lg:w-[calc(100%-var(--hm-sidebar-w))]"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: back or logo */}
        <div className="flex items-center gap-2 min-w-0">
          {!isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-hm-border bg-hm-surface px-3 py-2 text-[var(--hm-orange)] shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98]"
              style={{ minWidth: 44, minHeight: 44, marginLeft: -8 }}
              aria-label="Zurück"
            >
              <ArrowLeft className="h-5 w-5 flex-shrink-0" />
              {label && (
                <span className="text-sm font-medium truncate max-w-[140px]">{label}</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="leading-tight">
                <p className="text-[18px] font-bold tracking-[-0.04em] text-hm-text">
                  Huf<span className="text-[var(--hm-orange)]">Manager</span>
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-hm-muted">Slim Arbeitsmodus</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <NotificationBell className="rounded-xl border border-hm-border bg-hm-surface text-hm-muted shadow-sm transition-all hover:bg-orange-50 hover:text-[var(--hm-orange)] active:scale-[0.98]" />
          <HufiMenu className="rounded-xl border border-hm-border bg-hm-surface shadow-sm transition-all hover:bg-orange-50 hover:text-[var(--hm-orange)] active:scale-[0.98]" />
        </div>
      </div>
    </header>
  );
};
