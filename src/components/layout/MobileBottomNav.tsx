import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Users, Sparkles, Receipt, CalendarCheck, Settings, Mic } from "lucide-react";
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
  { key: "kalender",   label: "Kalender",   Icon: Calendar, path: "/kalender"   },
  { key: "pferde",     label: "Pferde",     Icon: Sparkles, path: "/pferde"     },
  { key: "kunden",     label: "Kunden",     Icon: Users,    path: "/kunden"     },
  { key: "rechnungen", label: "Rechnungen", Icon: Receipt,  path: "/rechnungen" },
];

// Client hatte vorher zweimal "Pferde" in der Leiste (l2 und r1 zeigten beide
// auf /client-horses) — hier auf eindeutige Tabs bereinigt.
const CLIENT_TABS: NavTab[] = [
  { key: "booking", label: "Termine", Icon: CalendarCheck, path: "/client-booking" },
  { key: "horses",  label: "Pferde",  Icon: Sparkles,      path: "/client-horses"  },
  { key: "profil",  label: "Profil",  Icon: Settings,      path: "/client-profile" },
];

// Der Assistenten-Screen (MobileShell) hört auf dieses Event, wenn man den
// Mic-Knopf antippt und schon dort ist. Ein Fenster-Event statt Context oder
// Store: die Leiste und der Screen liegen in verschiedenen Router-Ästen, und
// es geht um genau ein Signal ohne Zustand.
export const HUFI_MIC_EVENT = "hufi:mic";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  const isClient = role === "client";
  const tabs = isClient ? CLIENT_TABS : PROVIDER_TABS;
  const assistantPath = isClient ? "/client-home" : "/home";
  const onAssistant = location.pathname === assistantPath;

  // Ungerade Client-Tab-Zahl: links zwei, rechts der Rest.
  const half = Math.ceil(tabs.length / 2);
  const leftTabs = tabs.slice(0, half);
  const rightTabs = tabs.slice(half);

  function isActive(path: string) {
    return location.pathname.startsWith(path);
  }

  function handleMic() {
    if (onAssistant) window.dispatchEvent(new Event(HUFI_MIC_EVENT));
    else navigate(assistantPath);
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
          color: active ? "#F97316" : "#9CA3AF",
          userSelect: "none", WebkitUserSelect: "none",
          transition: "color 0.15s",
        }}
      >
        <tab.Icon size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
        <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>
          {tab.label}
        </span>
      </button>
    );
  }

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: "28rem", zIndex: "var(--z-bar)",
      display: "flex", alignItems: "center",
      background: "rgba(255,255,255,0.94)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)",
      boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(0,0,0,0.06)",
      // Der Sicherheitsabstand des Geraets kommt ZUSAETZLICH zu den 68px,
      // sonst frisst das padding die Hoehe der Tippflaechen auf.
      height: "calc(var(--hufi-nav-h) + env(safe-area-inset-bottom, 0px))",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {leftTabs.map(renderTab)}

      {/* Mikrofon — der wichtigste Knopf der App, deshalb Mitte und groß.
          Ragt bewusst über die Leiste hinaus; der Ring in Leistenfarbe
          schneidet ihn optisch frei. */}
      <div style={{ width: 96, height: "100%", flexShrink: 0, position: "relative" }}>
        <button
          onClick={handleMic}
          aria-label={onAssistant ? "Aufnahme starten" : "Hufi öffnen"}
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            bottom: 8,
            width: 76, height: 76, borderRadius: "50%", border: "none",
            background: "radial-gradient(circle at 40% 34%, #FFC46B 0%, #F97316 48%, #B23A0A 100%)",
            color: "#FFFFFF", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 26px rgba(249,115,22,0.44), 0 0 0 6px rgba(255,255,255,0.94)",
          }}
        >
          <Mic size={30} strokeWidth={2} />
        </button>
      </div>

      {rightTabs.map(renderTab)}
    </nav>
  );
}
