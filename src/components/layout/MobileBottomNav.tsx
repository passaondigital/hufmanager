import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, CalendarCheck, Map, Receipt, Settings, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavTab {
  key: string;
  label: string;
  Icon: React.ElementType;
  path: string;
}

// Feste Tabs — bewusst NICHT konfigurierbar (Entscheidung 30.07.2026).
// Das frühere Gedrückthalten zum Tauschen ist ersatzlos entfallen: die Geste
// war auf Pascals Gerät nicht bedienbar und kollidierte mit dem Scrollen.
// In der Mitte sitzt der Mikrofon-Knopf, kein Home-Tab: der Mic-Knopf führt
// selbst auf den Assistenten-Screen, ein zweiter Weg dorthin ist überflüssig.
const PROVIDER_TABS: NavTab[] = [
  { key: "heute",      label: "Heute",      Icon: Calendar, path: "/home" },
  { key: "tour",       label: "Tour",       Icon: Map,      path: "/home/tour" },
  { key: "kunden",     label: "Kunden",     Icon: Users,    path: "/home/kunden" },
  { key: "analyse",    label: "Analyse",    Icon: Sparkles, path: "/home/hufi-hufanalyse" },
  { key: "finanzen",   label: "Finanzen",   Icon: Receipt,  path: "/home/finanzen" },
  { key: "mehr",       label: "Mehr",       Icon: Settings, path: "/home/mehr" },
];

// Client hatte vorher zweimal "Pferde" in der Leiste (l2 und r1 zeigten beide
// auf /client-horses) — hier auf eindeutige Tabs bereinigt.
const CLIENT_TABS: NavTab[] = [
  { key: "booking", label: "Termine", Icon: CalendarCheck, path: "/client-booking" },
  { key: "horses",  label: "Pferde",  Icon: Sparkles,      path: "/client-horses"  },
  { key: "profil",  label: "Profil",  Icon: Settings,      path: "/client-profile" },
];

export const HUFI_MIC_EVENT = "hufi:mic";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  const isClient = role === "client";
  const tabs = isClient ? CLIENT_TABS : PROVIDER_TABS;

  function isActive(path: string) {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  }

  function renderTab(tab: NavTab) {
    const active = isActive(tab.path);
    return (
      <button key={tab.key}
        onClick={() => navigate(tab.path)}
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
        style={{
          flex: 1, height: "100%", minWidth: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 4, border: "none", cursor: "pointer", background: "transparent",
          color: active ? "#FF6A00" : "var(--hm-text-secondary)",
          userSelect: "none", WebkitUserSelect: "none",
          transition: "color 0.15s",
        }}
      >
        <tab.Icon size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
        {/* "Rechnungen" wurde auf 360px-Displays rechts abgeschnitten -- die
            4 Tabs teilen sich die Breite neben dem 96px breiten Mic-Bereich,
            das laesst pro Tab wenig Platz. Ellipsis statt hartem Ueberlauf. */}
        <span style={{
          fontSize: 10, fontWeight: active ? 700 : 500, lineHeight: 1, letterSpacing: "0.01em",
          width: "100%", textAlign: "center",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {tab.label}
        </span>
      </button>
    );
  }

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", zIndex: "var(--z-bar)",
      display: "flex", alignItems: "center",
      background: "var(--hm-surface)",
      borderTop: "1px solid var(--hm-border)",
      boxShadow: "0 -1px 2px rgba(26,26,26,0.04)",
      height: "calc(var(--hufi-nav-h) + env(safe-area-inset-bottom, 0px))",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map(renderTab)}
    </nav>
  );
}
